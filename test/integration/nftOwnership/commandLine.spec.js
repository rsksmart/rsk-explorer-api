import { expect } from 'chai'
import fs from 'fs'
import http from 'http'
import net from 'net'
import path from 'path'
import { spawn } from 'child_process'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository, configRepository } from '../../../src/repositories'
import { backfillTransfers } from '../../../src/tools/backfillNftOwnership'
import { EXPLORER_INITIAL_CONFIG_ID } from '../../../src/lib/defaultConfig'
import { blockData, erc721, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase } from './replay'

const ROOT = path.resolve(__dirname, '../../..')
const BACKFILL = path.join(ROOT, 'src/tools/backfillNftOwnership.js')
const REDETECT = path.join(ROOT, 'src/tools/redetectContracts.js')
const C721 = '0x00000000000000000000000000000000000e0721'
const A = `0x${'1'.repeat(40)}`

function runTool (tool, nodeUrl, args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--require', '@babel/register', tool, ...args], { cwd: ROOT, env: { ...process.env, RSK_NODE_URL: nodeUrl } })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('exit', status => resolve({ status, stdout, stderr }))
  })
}

const runBackfill = (nodeUrl, ...args) => runTool(BACKFILL, nodeUrl, args)

function closedPort () {
  const server = net.createServer()
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    server.close(() => resolve(port))
  }))
}

function nodeAnsweringEveryCallWithAnError () {
  const server = http.createServer((request, response) => {
    let body = ''
    request.on('data', chunk => { body += chunk })
    request.on('end', () => {
      const payload = JSON.parse(body)
      const answer = ({ id }) => ({ jsonrpc: '2.0', id, error: { code: -32603, message: 'injected internal error' } })
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify(Array.isArray(payload) ? payload.map(answer) : answer(payload)))
    })
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

integrationDescribe('NFT ownership: the backfill and the re-detection run as commands', function () {
  this.timeout(120000)
  let node

  before(async () => {
    node = await nodeAnsweringEveryCallWithAnError()
    await resetDatabase()
    await prismaClient.explorer_initial_config.deleteMany({})
    await configRepository[EXPLORER_INITIAL_CONFIG_ID].save({ nativeContracts: { bridge: '0x0000000000000000000000000000000001000006' }, net: { id: '31' } })
    await blocksRepository.saveBlockData(blockData(10, 'a', [erc721(C721, ZERO, A, 1)]))
    await resetDatabase({ keepBlocksAndEvents: true })
  })
  after(async () => {
    node.close()
    await prismaClient.explorer_initial_config.deleteMany({})
  })

  it('each tool exits 1 with the reason on an argument that is not a whole number or names an empty range, and on a candidate the node fails, and exits 0 on a valid range', async () => {
    const nodeUrl = `http://127.0.0.1:${node.address().port}`
    const backfillRuns = [['A', '3400000', '3.49e6'], ['A', '20', '10'], ['B', '1000'], ['A', '10', '10']]
    const [exponent, reversed, aboveTip, oneBlock, ...redetect] = await Promise.all([
      ...backfillRuns.map(args => runBackfill(nodeUrl, ...args)),
      ...['5e2', '0', '50.5', '50'].map(pageSize => runTool(REDETECT, nodeUrl, ['nft-transfer-emitters', pageSize]))
    ])
    for (const run of redetect) {
      const resultFile = (run.stdout.match(/Result file saved to (\S+)/) || [])[1]
      if (resultFile) fs.unlinkSync(resultFile)
    }
    const output = run => run.stdout + run.stderr

    expect([exponent, reversed, aboveTip, oneBlock, ...redetect].map(run => run.status)).to.deep.equal([1, 1, 1, 0, 1, 1, 1, 1])
    expect(exponent.stdout).to.include('must be whole numbers, such as 3490000: got 3.49e6')
    expect(output(reversed)).to.include('fromBlock 20 is above toBlock 10: the range is empty')
    expect(output(aboveTip)).to.include('fromBlock 1000 is above toBlock 10 (the highest stored block): the range is empty')
    expect(oneBlock.stdout).to.include('blocks 10..10')
    expect(redetect.slice(0, 3).map(run => (run.stdout.match(/Must be a whole number of at least 1, such as 50: got (\S+)/) || [])[1])).to.deep.equal(['5e2', '0', '50.5'])
    expect(redetect[3].stdout).to.include(`${C721}: FAILED`).and.match(/Done in \d+ ms\. tagged \(ERC721, ERC1155\): 0, not tagged: 0, failed: 1/)
  })

  it('phase B and the contract re-detection print their run report and exit 1, with no stack trace, when the node refuses the connection', async () => {
    await backfillTransfers({ fromBlock: 0, toBlock: 100, chunkBlocks: 10 })
    await prismaClient.token_state_at_block.deleteMany({})
    const nodeUrl = `http://127.0.0.1:${await closedPort()}`
    const [phaseB, redetect] = await Promise.all([runBackfill(nodeUrl, 'B'), runTool(REDETECT, nodeUrl, ['nft-transfer-emitters', '50'])])

    expect([phaseB.status, redetect.status]).to.deep.equal([1, 1])
    expect(phaseB.stdout).to.include('Error backfilling NFT ownership: connect ECONNREFUSED').and.include('Stopped: {"blocksRead":1,"pairs":1,')
    expect(redetect.stdout).to.include('Error re-detecting contracts: connect ECONNREFUSED').and.match(/Stopped after \d+ ms\. tagged \(ERC721, ERC1155\): 0, not tagged: 0, failed: 0/)
    expect(phaseB.stderr + redetect.stderr).not.to.match(/^\s+at /m)
  })
})

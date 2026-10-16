import { expect } from 'chai'
import http from 'http'
import net from 'net'
import path from 'path'
import { spawn } from 'child_process'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository, configRepository, tokenStateRepository } from '../../../src/repositories'
import { backfillTransfers } from '../../../src/tools/backfillNftOwnership'
import { EXPLORER_INITIAL_CONFIG_ID } from '../../../src/lib/defaultConfig'
import { blockData, erc721, tokenStateAt, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase } from './replay'

const ROOT = path.resolve(__dirname, '../../..')
const BACKFILL = path.join(ROOT, 'src/tools/backfillNftOwnership.js')
const REDETECT = path.join(ROOT, 'src/tools/redetectContracts.js')
const C721 = '0x00000000000000000000000000000000000e0721'
const A = `0x${'1'.repeat(40)}`

function runScript (tool, nodeUrl, args) {
  const entry = `require('@babel/register')
const { config, nodeSources } = require('./src/lib/config')
config.source = nodeSources({ url: ${JSON.stringify(nodeUrl)} })
config.blocks.source = config.source
process.argv = [process.argv[0], ${JSON.stringify(tool)}, ...${JSON.stringify(args)}]
require('module').runMain()`
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['-e', entry], { cwd: ROOT })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('exit', status => resolve({ status, stdout, stderr }))
  })
}

const runTool = (nodeUrl, ...args) => runScript(BACKFILL, nodeUrl, args)

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

integrationDescribe('NFT ownership: the backfill command line exits 0 only when its phase has nothing left to store', function () {
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

  it('phase A exits 0 after writing every block', async () => {
    const { status, stdout } = await runTool(`http://127.0.0.1:${node.address().port}`, 'A')

    expect(stdout).to.include('"blocksWritten":1')
    expect(status).to.equal(0)
  })

  it('phase B exits 1 while the node fails a pair\'s reads, and 0 once a rerun finds nothing left to store', async () => {
    const failed = await runTool(`http://127.0.0.1:${node.address().port}`, 'B')
    await prismaClient.$transaction(tokenStateRepository.insertStatements({ number: 10 }, [tokenStateAt(C721, 10)]))
    const rerun = await runTool(`http://127.0.0.1:${node.address().port}`, 'B')

    expect(failed.stdout).to.include('"failure":"injected internal error"')
    expect([failed.status, rerun.status]).to.deep.equal([1, 0])
  })

  it('refuses a block argument that is not a whole number, and a fromBlock above toBlock or above the highest stored block, with exit 1 and the reason', async () => {
    const nodeUrl = `http://127.0.0.1:${node.address().port}`
    const runs = [['A', '3400000', '3.49e6'], ['A', '10abc'], ['A', '20', '10'], ['A', '1000'], ['B', '1000'], ['A', '10', '10']]
    const [exponent, suffix, reversed, aboveTipA, aboveTipB, oneBlock] = await Promise.all(runs.map(args => runTool(nodeUrl, ...args)))
    const output = run => run.stdout + run.stderr

    expect([exponent, suffix, reversed, aboveTipA, aboveTipB, oneBlock].map(run => run.status)).to.deep.equal([1, 1, 1, 1, 1, 0])
    expect(exponent.stdout).to.include('must be whole numbers, such as 3490000: got 3.49e6')
    expect(suffix.stdout).to.include('got 10abc')
    expect(output(reversed)).to.include('fromBlock 20 is above toBlock 10: the range is empty')
    expect(output(aboveTipA)).to.include('fromBlock 1000 is above toBlock 10 (the highest stored block): the range is empty')
    expect(output(aboveTipB)).to.include('fromBlock 1000 is above toBlock 10 (the highest stored block): the range is empty')
    expect(oneBlock.stdout).to.include('blocks 10..10')
  })

  it('phase B and the contract re-detection print their run report and exit 1, with no stack trace, when the node refuses the connection', async () => {
    await backfillTransfers({ fromBlock: 0, toBlock: 100, chunkBlocks: 10 })
    await prismaClient.token_state_at_block.deleteMany({})
    const nodeUrl = `http://127.0.0.1:${await closedPort()}`
    const [phaseB, redetect] = await Promise.all([runTool(nodeUrl, 'B'), runScript(REDETECT, nodeUrl, ['nft-transfer-emitters', '50'])])

    expect([phaseB.status, redetect.status]).to.deep.equal([1, 1])
    expect(phaseB.stdout).to.include('Error backfilling NFT ownership: connect ECONNREFUSED').and.include('Stopped: {"blocksRead":1,"pairs":1,')
    expect(redetect.stdout).to.include('Error re-detecting contracts: connect ECONNREFUSED').and.match(/Stopped after \d+ ms\. tagged \(ERC721, ERC1155\): 0, not tagged: 0, failed: 0/)
    expect(phaseB.stderr + redetect.stderr).not.to.match(/^\s+at /m)
  })
})

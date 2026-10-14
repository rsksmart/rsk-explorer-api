import { expect } from 'chai'
import http from 'http'
import path from 'path'
import { spawn } from 'child_process'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository, configRepository, tokenStateRepository } from '../../../src/repositories'
import { EXPLORER_INITIAL_CONFIG_ID } from '../../../src/lib/defaultConfig'
import { blockData, erc721, tokenStateAt, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase } from './replay'

const ROOT = path.resolve(__dirname, '../../..')
const TOOL = path.join(ROOT, 'src/tools/backfillNftOwnership.js')
const C721 = '0x00000000000000000000000000000000000e0721'
const A = `0x${'1'.repeat(40)}`

function runTool (nodeUrl, ...args) {
  const entry = `require('@babel/register')
const { config, nodeSources } = require('./src/lib/config')
config.source = nodeSources({ url: ${JSON.stringify(nodeUrl)} })
config.blocks.source = config.source
process.argv = [process.argv[0], ${JSON.stringify(TOOL)}, ...${JSON.stringify(args)}]
require('module').runMain()`
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['-e', entry], { cwd: ROOT })
    let stdout = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.resume()
    child.on('exit', status => resolve({ status, stdout }))
  })
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

  it('refuses a block argument that is not a whole number, and a fromBlock above toBlock, with exit 1 and the reason', async () => {
    const nodeUrl = `http://127.0.0.1:${node.address().port}`
    const [exponent, suffix, reversed] = await Promise.all([['A', '3400000', '3.49e6'], ['A', '10abc'], ['A', '20', '10']].map(args => runTool(nodeUrl, ...args)))

    expect([exponent.status, suffix.status, reversed.status]).to.deep.equal([1, 1, 1])
    expect(exponent.stdout).to.include('must be whole numbers, such as 3490000: got 3.49e6')
    expect(suffix.stdout).to.include('got 10abc')
    expect(reversed.stdout).to.include('fromBlock 20 is above toBlock 10')
  })
})

import { expect } from 'chai'
import sinon from 'sinon'
import { insertBlock } from '../../src/lib/servicesUtils'
import { nod3Connect } from '../../src/lib/nod3Connect'
import * as blockchainStats from '../../src/lib/getBlockchainStats'
import { blocksRepository, statsRepository, summaryRepository } from '../../src/repositories'

const initConfig = { net: { id: '30' } }

const pad = (hex, size) => `0x${hex.padStart(size, '0')}`
const miner = pad('beef01', 40)
const sender = pad('5e0d01', 40)
const receiver = pad('2ec01', 40)
const txHash = pad('7a01', 64)
const rawBlock = {
  number: '0x8e9fe2',
  hash: pad('b10c', 64),
  parentHash: pad('b10b', 64),
  timestamp: '0x6717f2a0',
  miner,
  transactions: [txHash],
  uncles: [],
  gasUsed: '0x5208'
}
const rawTx = {
  hash: txHash,
  blockHash: rawBlock.hash,
  blockNumber: rawBlock.number,
  transactionIndex: '0x0',
  nonce: '0x1',
  from: sender,
  to: receiver,
  gas: '0x5208',
  gasPrice: '0x387ee40',
  value: '0xde0b6b3a7640000',
  input: '0x'
}
const rawReceipt = {
  transactionHash: txHash,
  transactionIndex: '0x0',
  blockHash: rawBlock.hash,
  blockNumber: rawBlock.number,
  from: sender,
  to: receiver,
  cumulativeGasUsed: '0x5208',
  gasUsed: '0x5208',
  contractAddress: null,
  logs: [{
    address: receiver,
    topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', pad(sender.slice(2), 64), pad(miner.slice(2), 64)],
    data: pad('64', 64),
    blockHash: pad('b10c', 64),
    blockNumber: '0x8e9fe2',
    transactionHash: txHash,
    transactionIndex: '0x0',
    logIndex: '0x0'
  }],
  logsBloom: pad('0', 512),
  status: '0x1'
}

function stubNode () {
  const nod3 = nod3Connect('http://127.0.0.1:9')
  const requests = []
  const answer = (method, params) => {
    requests.push({ method, params })
    switch (method) {
      case 'eth_getBlockByNumber': return Number(params[0]) === Number(rawBlock.number) ? rawBlock : null
      case 'eth_getBlockByHash': return params[0] === rawBlock.hash ? rawBlock : null
      case 'eth_getTransactionByHash': return rawTx
      case 'eth_getTransactionReceipt': return rawReceipt
      case 'trace_block': return []
      case 'eth_getBalance': return '0xde0b6b3a7640000'
      case 'eth_getCode': return '0x'
      default: throw new Error(`Unexpected node method ${method}`)
    }
  }
  sinon.stub(nod3.rpc, 'sendMethod').callsFake(async (method, params) => answer(method, params))
  sinon.stub(nod3.rpc, 'send').callsFake(async payload => payload.map(({ method, params }) => answer(method, params)))
  return { nod3, requests }
}

async function storeBlock ({ hash }) {
  const { nod3, requests } = stubNode()
  const infoLines = []
  const log = { info: m => infoLines.push(m), error () {}, warn () {}, debug () {}, trace () {} }
  const saved = []
  const stored = new Map()
  sinon.stub(blocksRepository, 'findOne').callsFake(async ({ number }) => stored.get(number) || null)
  sinon.stub(blocksRepository, 'saveBlockData').callsFake(async data => {
    saved.push(JSON.parse(JSON.stringify(data)))
    stored.set(data.block.number, data.block)
  })
  sinon.stub(summaryRepository, 'findOne').resolves(null)
  sinon.stub(summaryRepository, 'find').resolves([])
  const stats = sinon.stub(blockchainStats, 'getBlockchainStats').resolves({})
  sinon.stub(statsRepository, 'insertOne').resolves()
  sinon.stub(Date, 'now').returns(1729616000000)
  // the log comes from an address without code, so it is stored undecoded and Tx traces it
  sinon.stub(console, 'trace')

  const number = Number(rawBlock.number)
  const result = await insertBlock(number, { nod3, log, initConfig }, { log, tipBlock: true, hash })

  sinon.restore()
  const otherRequests = requests.filter(r => !r.method.startsWith('eth_getBlockBy'))
  const blockMethods = requests.filter(r => r.method.startsWith('eth_getBlockBy')).map(r => r.method)
  return { result, saved, statsArgs: stats.args, otherRequests, blockMethods, infoLines }
}

describe('# a block stored by hash holds the same data as one stored by number', function () {
  afterEach(() => sinon.restore())

  it('passes the same block, transactions, receipts, events, addresses, balances and stats to the store', async () => {
    const byNumber = await storeBlock({ hash: null })
    const byHash = await storeBlock({ hash: rawBlock.hash })

    expect(byNumber.result).to.equal(true)
    expect(byHash.result).to.equal(true)
    expect(byNumber.infoLines.filter(line => line.includes(`${rawBlock.hash}) saved`))).to.have.lengthOf(1)
    expect(byHash.infoLines.filter(line => line.includes(`${rawBlock.hash}) saved`))).to.have.lengthOf(1)
    expect(byNumber.saved).to.have.lengthOf(1)
    expect(byNumber.saved[0].transactions).to.have.lengthOf(1)
    expect(byNumber.saved[0].events).to.have.lengthOf(1)
    expect(byNumber.saved[0].addresses.map(a => a.address)).to.include.members([miner, sender, receiver])
    expect([...new Set(byNumber.blockMethods)]).to.deep.equal(['eth_getBlockByNumber'])
    expect([...new Set(byHash.blockMethods)]).to.deep.equal(['eth_getBlockByHash'])
    expect(byHash.saved).to.deep.equal(byNumber.saved)
    expect(byHash.statsArgs).to.deep.equal(byNumber.statsArgs)
    expect(byHash.otherRequests).to.deep.equal(byNumber.otherRequests)
  })
})

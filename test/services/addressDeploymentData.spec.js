import { expect } from 'chai'
import sinon from 'sinon'
import Address from '../../src/services/classes/Address'
import Block from '../../src/services/classes/Block'
import BlockSummary from '../../src/services/classes/BlockSummary'
import Contract from '../../src/services/classes/Contract'
import { addressRepository } from '../../src/repositories'
import { getAddressRepository } from '../../src/repositories/address.repository'
import { nativeContracts } from '../../src/lib/NativeContracts'

const initConfig = { net: { id: '31' } }
const log = { info () {}, error () {}, warn () {}, debug () {}, trace () {} }
const address = '0x0000000000000000000000000000000000abc001'
const blockNumber = 2000

const creationTx = (hash, timestamp = 1700000000) => ({
  hash,
  blockNumber: 900,
  input: `0xdeploy${hash}`,
  timestamp,
  receipt: { contractAddress: address, status: '0x1' }
})

const nod3 = (code = '0x6080604052') => ({ eth: { getBalance: sinon.stub().resolves('0x10'), getCode: sinon.stub().resolves(code) } })

function storeHolds (creationTxRow) {
  const findUnique = sinon.stub().resolves(creationTxRow)
  const repository = getAddressRepository({ contract_creation_tx: { findUnique } })
  sinon.stub(addressRepository, 'findCreationTx').callsFake(repository.findCreationTx)
  return findUnique
}

function searchFinds (addr) {
  const tx = creationTx('0xsearched')
  addr.bcSearch = {
    deploymentBlock: sinon.stub().resolves(tx.blockNumber),
    deploymentTx: sinon.stub().resolves({ tx, timestamp: tx.timestamp, receipt: tx.receipt })
  }
  return addr.bcSearch
}

function saveWrites (data, model) {
  const writes = []
  const prisma = new Proxy({}, { get: (_, table) => new Proxy({}, { get: (_, op) => args => writes.push({ table, op, args }) }) })
  getAddressRepository(prisma).insertOne(data)
  return writes.filter(write => write.table === model).map(write => write.args.data)
}

describe('# Address deployment data', function () {
  beforeEach(() => sinon.stub(Contract.prototype, 'fetch').resolves({}))

  afterEach(() => sinon.restore())

  it('uses the stored creation tx, read by primary key, without searching', async () => {
    const findUnique = storeHolds({ tx: JSON.stringify(creationTx('0xstored')) })
    const addr = new Address(address, { nod3: nod3(), initConfig, log, block: blockNumber })
    const search = searchFinds(addr)

    await addr.fetch()

    expect(findUnique.args).to.deep.equal([[{ where: { contractAddress: address }, select: { tx: true } }]])
    expect(search.deploymentBlock.called).to.equal(false)
  })

  it('saves the block without writing back a stored value, whatever the stored creation tx holds', async () => {
    const searched = creationTx('0xsearched')
    const cases = [
      [{ tx: JSON.stringify(creationTx('0xstored', '0x6553f100')) }, 'stored'],
      [null, 'searched'],
      [{ tx: null }, 'searched'],
      [{ tx: '{not json' }, 'searched'],
      [{ tx: '5' }, 'searched'],
      [{ tx: '"abc"' }, 'searched'],
      [{ tx: '[]' }, 'searched'],
      [{ tx: '{}' }, 'searched'],
      [{ tx: '{"type":"create"}' }, 'searched']
    ]

    for (const [creationTxRow, source] of cases) {
      sinon.restore()
      sinon.stub(Contract.prototype, 'fetch').resolves({})
      storeHolds(creationTxRow)
      const addr = new Address(address, { nod3: nod3(), initConfig, log, block: blockNumber })
      searchFinds(addr)

      const data = await addr.fetch()

      const expected = source === 'stored'
        ? { creationTxs: [], deployedCode: undefined }
        : { creationTxs: [[String(searched.timestamp), searched.hash]], deployedCode: searched.input }
      const creationTxs = saveWrites(data, 'contract_creation_tx').map(({ timestamp, tx }) => [timestamp, JSON.parse(tx).hash])
      expect(creationTxs, creationTxRow && creationTxRow.tx).to.deep.equal(expected.creationTxs)
      expect(saveWrites(data, 'contract')[0].deployedCode, creationTxRow && creationTxRow.tx).to.equal(expected.deployedCode)
    }
  })

  it('never reads the store for an address of a block being replaced in place', async () => {
    const findUnique = storeHolds({ tx: JSON.stringify(creationTx('0xstored')) })
    sinon.stub(BlockSummary.prototype, 'getBlockData').resolves({ number: blockNumber, hash: `0x${'b'.repeat(64)}`, miner: address, transactions: [] })
    sinon.stub(BlockSummary.prototype, 'getSummariesAddresses').resolves([])
    const block = new Block(blockNumber, { nod3: nod3(), initConfig, log }, null, false, true)
    const addr = (await block.summary.getAddresses()).createAddress(address, { block: blockNumber })
    const search = searchFinds(addr)

    await addr.fetch()

    expect(findUnique.called).to.equal(false)
    expect(search.deploymentBlock.args).to.deep.equal([[address, blockNumber]])
  })

  it('never reads the store for an address without code, the zero address or a native contract', async () => {
    const findUnique = storeHolds(null)

    for (const [addr, code] of [[address, '0x'], ['0x0000000000000000000000000000000000000000'], [nativeContracts.bridge]]) {
      await new Address(addr, { nod3: nod3(code), initConfig, log, block: blockNumber }).fetch()
    }

    expect(findUnique.called).to.equal(false)
  })
})

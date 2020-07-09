import { Nod3 } from 'nod3'
import { expect } from 'chai'
import BlockSummary from '../../src/services/classes/BlockSummary'
import blocks from './blockData'
import { Spy } from '../shared'
import config from '../../src/lib/config'
const url = config.source.url
let nod3 = new Nod3(new Nod3.providers.HttpProvider(url))
const initConfig = {
  nativeContracts: {
    bridge: '0x0000000000000000000000000000000001000006',
    remasc: '0x0000000000000000000000000000000001000008'
  },
  net: { id: '31', name: 'RSK Testnet' }
}

/* describe(`# BlockSummary trace`, function () {
  let txSpy = Spy(nod3.trace, 'transaction')
  let block = blocks[0]
  let { hash } = block.block
  this.timeout(60000)
  it(`should fetch block`, async () => {
    let summary = new BlockSummary(hash, { nod3, initConfig })
    await summary.fetch().catch(() => { })
    expect(txSpy.spy.args.length).to.be.equal(0)
    txSpy.remove()
  })
}) */

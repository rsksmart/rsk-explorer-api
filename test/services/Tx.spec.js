import Tx from '../../src/services/classes/Tx'
import blocks from './blockData'
import { expect } from 'chai'
import { BlocksBase } from '../../src/lib/BlocksBase'
import datasource from '../../src/lib/dataSource'

describe(`#Tx`, function () {
  for (let blockData of blocks) {
    let { block } = blockData
    let { txs } = block
    let { number: blockNumber, timestamp } = block.block
    for (let txe of txs) {
      let { hash } = txe
      describe(`Tx: ${hash} / ${blockNumber} `, function () {
        this.timeout(60000)
        it(`should return tx data`, async () => {
          let { db, initConfig } = await datasource()
          let tx = new Tx(hash, timestamp, new BlocksBase(db, { initConfig }))
          await tx.fetch()
          let data = await tx.getData()
          expect(data).to.haveOwnProperty('tx')
          expect(data.tx.txType).to.be.deep.equal(txe.txType, 'tx type')
          for (let p in txe.receipt) {
            expect(data.tx.receipt[p]).to.be.deep.equal(txe.receipt[p], p)
          }
        })
      })
    }
  }
})

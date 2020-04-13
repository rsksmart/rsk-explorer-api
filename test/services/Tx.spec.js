import { Tx, txTypes } from '../../src/services/classes/Tx'
import blocks from './blockData'
import { expect } from 'chai'
import { BlocksBase } from '../../src/lib/BlocksBase'
import datasource from '../../src/lib/dataSource'
import Address from '../../src/services/classes/Address'

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
          expect(tx.toAddress instanceof Address).to.be.equal(true, 'toAddress must be an instance of Address')
          let { isContract, isNative } = tx.toAddress
          expect(typeof isContract).to.be.equal('function', 'toAddress.isContract must be a function')
          expect(typeof isNative).to.be.equal('boolean', 'isNative must be a boolean variable')
          let expectedType = (tx.toAddress.isContract() && !isNative) ? txTypes.call : txe.txType
          expect(data).to.haveOwnProperty('tx')
          expect(data.tx.txType).to.be.deep.equal(expectedType, 'tx type')
          for (let p in txe.receipt) {
            expect(data.tx.receipt[p]).to.be.deep.equal(txe.receipt[p], p)
          }
        })
      })
    }
  }
})

import { Tx } from '../../src/services/classes/Tx'
import { expect } from 'chai'
import { testCollections, initConfig } from '../shared'
import nod3 from '../../src/lib/nod3Connect'
import block03 from './blockData/03.json'

const blocks = [block03]

describe('Tx fecth', function () {
  this.timeout(10000)
  for (let { result: blockData } of blocks) {
    const { transactions, timestamp } = blockData
    for (let transaction of transactions) {
      let { hash } = transaction
      it('should fetch a transaction', async () => {
        let collections = await testCollections(true)
        let tx = new Tx(hash, timestamp, { nod3, initConfig, collections, blockData, notTrace: true })
        let receipt = await nod3.eth.getTransactionReceipt(hash)
        let txData = await tx.fetch()
        expect(txData).to.be.an('object')
        expect(txData).has.ownProperty('tx')
        expect(txData.tx).has.ownProperty('receipt')
        for (let prop in receipt) {
          expect(txData.tx.receipt).has.ownProperty(prop)
        }
        expect(txData.tx.receipt.logs.length).to.be.equal(receipt.logs.length)
        for (let i in receipt.logs) {
          let receiptLog = receipt.logs[i]
          let txLog = txData.tx.receipt.logs[i]
          for (let p in receiptLog) {
            expect(txLog[p]).to.be.deep.equal(receiptLog[p])
          }
        }
        expect(txData).has.ownProperty('events')
        expect(txData.events.length).to.be.equal(receipt.logs.length)
        for (let event of txData.events) {
          expect(event).has.ownProperty('logIndex')
          let log = receipt.logs.find(l => l.logIndex === event.logIndex)
          expect(log).to.be.an('object')
        }
      })
    }
  }
})

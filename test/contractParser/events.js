import { assert } from 'chai'
import { ContractParser } from '../../src/lib/ContractParser/ContractParser'
import { serialize } from '../../src/lib/utils'
import txs from './txs/'
import initConfig from '../../src/lib/initialConfiguration'

describe('# decode events', function () {
  for (let t of txs) {
    let id = t.netId || 31
    initConfig.net = { id }
    let parser = new ContractParser({ initConfig })
    let tx = t.tx
    let e = t.expect
    describe(`TX: ${tx.transactionHash}`, function () {
      let decodedLogs = parser.parseTxLogs(tx.logs)
      decodedLogs = decodedLogs.map(log => serialize(log))

      it(`should return ${e.events.length} events`, function () {
        assert.equal(tx.logs.length, e.events.length)
      })

      for (let i = 0; i < e.events.length; i++) {
        describe(`Event ${i}`, function () {
          let event = e.events[i]
          let decoded = decodedLogs[i]
          it(`should be ${event.event} event`, function () {
            assert.equal(event.event, decoded.event)
          })

          it(`should have an abi property`, () => {
            assert.property(decoded, 'abi')
          })

          let argsLength = Object.keys(event.args).length
          it(`should have: ${argsLength} arguments`, function () {
            assert.equal(argsLength, Object.keys(decoded.args).length)
          })

          let keys = Object.keys(event.args)

          for (let a in event.args) {
            let arg = event.args[a]
            it(`should have: ${a} arg with value: ${arg}`, function () {
              assert.deepEqual(decoded.args[keys.indexOf(a)], arg)
            })
          }
        })
      }
    })
  }
})

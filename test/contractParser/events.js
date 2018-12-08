import { assert } from 'chai'
import { ContractParser } from '../../src/lib/ContractParser/ContractParser'
import tx1 from './txs/01.json'

const txs = [
  {
    tx: tx1.result,
    expect: {
      events: [
        {
          event: 'OwnershipTransferred',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: '0x9128785b060d47ab417d6cee72e25358c6bd677f'
          }
        }
      ]
    }
  }
]

const parser = new ContractParser()

describe('# decode events', function () {
  for (let t of txs) {
    let tx = t.tx
    let e = t.expect
    describe(`TX: ${tx.transactionHash}`, function () {
      let decodedLogs = parser.parseTxLogs(tx.logs)

      it(`should return ${e.events.length} events`, function () {
        assert.equal(tx.logs.length, e.events.length)
      })

      for (let i = 0; i < e.events.length; i++) {
        let event = e.events[i]
        let decoded = decodedLogs[i]
        it(`should be ${event.event} event`, function () {
          assert.equal(event.event, decoded.event)
        })

        let argsLength = Object.keys(event.args).length
        it(`should have ${argsLength} arguments`, function () {
          assert.equal(argsLength, Object.keys(decoded.args).length)
        })

        for (let a in event.args) {
          let arg = event.args[a]
          it(`should have: ${a} arg with value: ${arg}`, function () {
            assert.propertyVal(decoded.args, a, arg)
          })
        }

      }

    })
  }
})

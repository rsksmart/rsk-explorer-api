import { assert } from 'chai'
import { ContractParser } from '../../src/lib/ContractParser/ContractParser'
import { serialize } from '../../src/lib/utils'
import tx1 from './txs/01.json'
import tx2 from './txs/02.json'

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
  },
  {
    tx: tx2.result,
    expect: {
      events: [
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0xb92675ccf00728fee1390a5d0d4ca594ecfb5c1f',
            value: '0xfd5b62ad0505ecaed7000'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0xd5ae806315937698db2b9c13bbfc149e59dcda80',
            value: '0x21c7eb0600ab814f06c00'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0xe4e962e97998a976a337752c978eff857379850c',
            value: '0x10e3f5830055d347e2800'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0x2d9bea5f54e315dc40a14d4a2196687a15c6f9b2',
            value: '0x19d51d22b537ece26dc00'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0x517cd1c1ff08ab6a1c7ec742a8c51cc0f09954e5',
            value: '0x511300db34ceedbe4200'
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

          let argsLength = Object.keys(event.args).length
          it(`should have: ${argsLength} arguments`, function () {
            assert.equal(argsLength, Object.keys(decoded.args).length)
          })

          let keys = Object.keys(event.args)

          for (let a in event.args) {
            let arg = event.args[a]
            it(`should have: ${a} arg with value: ${arg}`, function () {
              assert.propertyVal(decoded.args, keys.indexOf(a), arg)
            })
          }
        })
      }

    })
  }
})

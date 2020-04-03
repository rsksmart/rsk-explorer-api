
import dataSource from '../lib/dataSource.js'
import nod3 from '../lib/nod3Connect'
import ContractParser from 'rsk-contract-parser'
import { add0x } from 'rsk-utils'

const parser = new ContractParser({ nod3 })

patch().then(() => {
  console.log('DONE!')
}).catch(err => {
  console.log('ERROR')
  console.log(err)
  process.exit(9)
})

async function patch () {
  try {
    let { db } = await dataSource({ skipCheck: true })
    let collection = db.collection('tokensAddresses')
    let cursor = collection.find()
    await cursor.forEach(async account => {
      try {
        let { balance, contract, address, _id } = account
        let name = `${contract}--${address}`
        if (balance !== null) {
          console.log(`Getting balance for ${name}`)
          let newBalance = await getBalance(account)
          newBalance = add0x(newBalance.toString(16))
          if (balance !== newBalance) {
            console.log(`Updating balance for ${name}`)
            await collection.updateOne({ _id }, { $set: { balance: newBalance } })
          } else {
            console.log(`${name} .... OK`)
          }
        } else {
          console.log(`${name} has null balance, skipped`)
        }
      } catch (err) {
        console.log(err, account)
        return Promise.reject(err)
      }
    })
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
}

async function getBalance ({ address, contract }, { abi } = {}) {
  try {
    let Contract = parser.makeContract(contract, abi)
    let balance = await Contract.call('balanceOf', [address])
    return balance
  } catch (err) {
    return Promise.reject(err)
  }
}

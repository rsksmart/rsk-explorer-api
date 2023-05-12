
import dataSource from '../lib/dataSource.js'
import nod3 from '../lib/nod3Connect'
import ContractParser from '@rsksmart/rsk-contract-parser'
import { add0x } from '@rsksmart/rsk-utils'
import { tokenRepository } from '../repositories/token.repository'

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
    const { db } = await dataSource({ skipCheck: true })
    const collection = db.collection('tokensAddresses')

    const tokens = await tokenRepository.find({}, {}, collection)

    for (const token of tokens) {
      try {
        const { balance, contract, address, id } = token
        const name = `${contract}--${address}`
        if (balance !== null) {
          console.log(`Getting balance for ${name}`)
          let newBalance = await getBalance(token)
          newBalance = add0x(newBalance.toString(16))
          if (balance !== newBalance) {
            console.log(`Updating balance for ${name}`)
            await Promise.all(tokenRepository.updateOne({ id }, { $set: { balance: newBalance } }, {}, collection))
          } else {
            console.log(`${name} .... OK`)
          }
        } else {
          console.log(`${name} has null balance, skipped`)
        }
      } catch (err) {
        console.log(err, token)
        return Promise.reject(err)
      }
    }
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

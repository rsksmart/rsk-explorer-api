import dataSource from '../lib/dataSource.js'
import { saveAddressToDb } from '../services/classes/Address'
import { nod3 } from '../lib/nod3Connect'
import { log } from '@rsksmart/rsk-js-cli'
import { addressRepository } from '../repositories/address.repository'

const save = process.argv[2] === '--save'
main().then((res) => {
  console.log('')
  console.log(JSON.stringify(res, null, 2))
  if (res.updated !== res.outdated) {
    console.log('----------------------------------------------------')
    console.log(`Run ${process.argv[0]} ${process.argv[1]} --save`)
    console.log('to update the balances')
    console.log('----------------------------------------------------')
  }
  process.exit(0)
})

async function main () {
  try {
    const { collections } = await dataSource()
    const collection = collections.Addrs
    const addresses = await addressRepository.countDocuments({}, collection)
    const cursor = addressRepository.find({}, {}, collection)
    let checked = 0
    let updated = 0
    let outdated = 0
    const lastBlock = await nod3.eth.getBlock('latest')
    while (await cursor.hasNext()) {
      console.log('')

      let { address, balance } = await cursor.next()
      checked++
      log.info(`${address} -- ${checked} / ${addresses}`)
      let newBalance = await nod3.eth.getBalance(address, 'latest')
      if (newBalance === balance) {
        log.ok(`${logTime()} The balance for ${address} is up to date`)
      } else {
        outdated++
        if (save) {
          newBalance = await nod3.eth.getBalance(address, 'latest')
          let blockNumber = await nod3.eth.blockNumber()
          if (parseInt(blockNumber) < parseInt(lastBlock.number)) {
            throw new Error(`Invalid block number ${blockNumber}`)
          }
          log.info(`${logTime()} Updating balance of: ${address} to ${newBalance}`)
          let result = await saveAddressToDb({ address, blockNumber, balance: newBalance }, collection)
          if (!result.ok) throw new Error(`Error updating balance for ${address}`)
          updated++
        } else {
          log.warn(`${logTime()} The balance of ${address} is outdated, balance:${balance}  newBalance:${newBalance}`)
        }
      }
    }
    return { addresses, checked, outdated, updated }
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

function logTime () {
  let d = new Date().toISOString()
  return `[${d}] -`
}

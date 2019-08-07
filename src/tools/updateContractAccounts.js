import Contract from '../services/classes/Contract'
import nod3 from '../lib/nod3Connect'
import BigNumber from 'bignumber.js'
import { bigNumberSum, add0x, isAddress } from '../lib/utils'
import dataSource from '../lib/dataSource'
import { info, warn, error } from '../lib/cli'

const contractAddress = process.argv[2]
if (!isAddress(contractAddress)) help()

const contract = new Contract(contractAddress, null, nod3)

dataSource().then(async ({ db }) => {
  const collection = db.collection('tokensAddresses')
  let accounts = await collection.find({ contract: contractAddress }).toArray()
  let { errors, totalDiff } = await updateBalances(accounts, collection)
  if (errors) {
    warn(`Total Diff:  ${totalDiff}`)
    error(JSON.stringify(errors, null, 2))
  }
  process.exit(0)
})

async function updateBalances (accounts, collection) {
  const errors = []
  const total = accounts.length
  let result = {}
  for (let i = 0; i < total; i++) {
    let account = accounts[i]
    let { address, balance } = account
    let msg = `${i + 1}/${total} ${address} `
    let Address = contract.addAddress(address)
    let newBalance = await Address.getBalance()
    newBalance = add0x(newBalance.toString(16))
    if (balance !== newBalance) {
      let difference = add0x(new BigNumber(newBalance).minus(new BigNumber(balance)).toString(16))
      const error = { address, balance, newBalance, difference }
      warn(`ERROR: ${msg}`)
      warn(`${JSON.stringify(error, null, 2)}`)
      errors.push(error)
      await collection.updateOne({ address, contract: contractAddress }, { $set: { balance: newBalance } })
    } else {
      info(msg)
    }
  }
  if (errors.length) {
    let totalDiff = bigNumberSum(errors.map(error => error.difference)).toString(16)
    result = { errors, totalDiff }
  }
  return result
}

function help () {
  const myName = process.argv[1].split('/').pop()
  info(`Usage: ${process.argv[0]} ${myName} [address]`)
  process.exit(0)
}

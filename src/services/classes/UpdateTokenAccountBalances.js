
import { add0x } from '@rsksmart/rsk-utils'
import ContractParser from '@rsksmart/rsk-contract-parser'
import { tokenRepository } from '../../repositories/token.repository'

export async function updateTokenAccountBalances (block, { nod3, collections, log }) {
  const parser = new ContractParser({ nod3 })
  let { number } = block
  number = parseInt(number) - 1
  if (number < 1) return
  log.trace(`Checking token account balances for block ${number}`)
  try {
    const collection = collections.TokensAddrs
    const query = { blockNumber: number }
    const tokens = await tokenRepository.find(query, {}, collection, {}, 0, false)

    for (const token of tokens) {
      try {
        let { balance, id, address, contract } = token
        let newBalance = await getBalance(token, { parser })
        if (balance !== newBalance) {
          log.info(`Updating token account balance ${contract}--${address}`)
          await tokenRepository.updateOne({ id }, { $set: { balance: newBalance } }, {}, collection)
        }
      } catch (err) {
        log.error(err)
        return Promise.reject(err)
      }
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

async function getBalance ({ address, contract }, { parser, abi } = {}) {
  try {
    let Contract = parser.makeContract(contract, abi)
    let balance = await Contract.call('balanceOf', [address])
    if (balance) balance = add0x(balance.toString(16))
    return balance
  } catch (err) {
    return Promise.reject(err)
  }
}

import { BcThing } from './BcThing'
import Contract from './Contract'
import { isBlockObject, isAddress } from '../../lib/utils'
import { isZeroAddress } from '@rsksmart/rsk-utils'

export class TokenAddress extends BcThing {
  constructor (tokenAddress, contract) {
    if (!isAddress(tokenAddress)) throw new Error(`Invalid tokenAddress: ${tokenAddress}`)
    if (!(contract instanceof Contract)) throw new Error(`Invalid Contract instance: ${contract}`)
    if (!contract.block || !isBlockObject(contract.block)) throw new Error(`Invalid Block object`)

    const { initConfig, address: contractAddress, block: { number, hash } } = contract

    super({ initConfig })

    this.isZeroAddress = isZeroAddress(tokenAddress)
    this.address = tokenAddress
    this.Contract = contract
    this.data = {
      address: tokenAddress,
      contract: contractAddress,
      balance: null,
      block: { number, hash }
    }
  }

  async fetchTokenAddressBalance () {
    const { isZeroAddress, Contract, address } = this
    if (isZeroAddress) return null

    try {
      const balance = await Contract.call('balanceOf', [address])
      this.setTokenAddressBalance(balance)
      return this.getData(true)
    } catch (err) {
      this.log.error(`Error fetching token balance for tokenAddress ${address}`, err)
      return Promise.reject(err)
    }
  }

  setTokenAddressBalance (balance) {
    this.setData({ balance })
  }
}

export default TokenAddress

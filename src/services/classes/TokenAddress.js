import { BcThing } from './BcThing'
import Contract from './Contract'
import { isBlockObject, isAddress } from '../../lib/utils'
import { isZeroAddress } from 'rsk-utils'

export class TokenAddress extends BcThing {
  constructor (address, contract) {
    if (!(contract instanceof Contract)) {
      throw new Error('contract is not instance of Contract')
    }
    if (!isAddress(address)) throw new Error(`Invalid address ${address}`)
    let { block } = contract
    if (!isBlockObject(block)) {
      throw new Error(`Block must be a block object`)
    }
    const { initConfig } = contract
    super({ initConfig })
    if (!this.isAddress(address)) {
      throw new Error(`TokenAddress: invalid address: ${address}`)
    }
    this.isZeroAddress = isZeroAddress(address)
    this.Contract = contract
    this.address = address
    let { number, hash } = block
    this.data = {
      address,
      contract: this.Contract.address,
      balance: null,
      block: { number, hash }
    }
  }
  async fetch () {
    try {
      let balance = await this.getBalance()
      this.data.balance = balance
      return this.getData(true)
    } catch (err) {
      return Promise.reject(err)
    }
  }
  getBalance () {
    if (this.isZeroAddress) return null
    return this.Contract.call('balanceOf', [this.address])
  }
}

export default TokenAddress

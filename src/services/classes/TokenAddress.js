import { BcThing } from './BcThing'
import Contract from './Contract'

export class TokenAddress extends BcThing {
  constructor (address, contract) {
    super()
    if (!(contract instanceof Contract)) {
      throw new Error('contract is not instance of Contract')
    }
    if (!this.isAddress(address)) {
      throw new Error(`TokenAddress: invalid address: ${address}`)
    }
    this.Contract = contract
    this.address = address
    this.data = {
      address,
      contract: this.Contract.address,
      balance: null
    }
  }
  async fetch () {
    try {
      let balance = await this.getBalance()
      this.data.balance = balance
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }
  getBalance () {
    return this.Contract.call('balanceOf', [this.address])
  }
}

export default TokenAddress

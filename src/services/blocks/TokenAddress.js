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
    this.data.balance = await this.getBalance()
    return this.getData()
  }
  async getBalance () {
    let address = this.address
    let balance = await this.Contract.call('balanceOf', address)
    return balance
  }
}

export default TokenAddress

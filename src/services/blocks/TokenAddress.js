import Contract from './Contract'

export class TokenAddress {
  constructor (address, contract) {
    if (!(contract instanceof Contract)) {
      throw (new Error('contract is not instance of Contract'))
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
  getData () {
    return this.data
  }
}

export default TokenAddress

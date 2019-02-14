import { BigNumber } from 'bignumber.js'
export class GetTxBalance {
  constructor (txCollection) {
    this.txCollection = txCollection
  }

  async getTxs (query) {
    let data = await this.txCollection.find(query)
      .project({ value: 1 })
      .toArray()
      .catch(err => Promise.reject(err))
    return data
  }

  sumValues (values) {
    let total = new BigNumber(0)
    values
      .map(v => v.value)
      .forEach(value => {
        total = total.plus(new BigNumber(value))
      })
    return total
  }

  async getBalanceFromTx (address) {
    try {
      const to = await this.getTxs({ to: address })
      const fr = await this.getTxs({ from: address })
      return (this.sumValues(to).minus(this.sumValues(fr)))
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

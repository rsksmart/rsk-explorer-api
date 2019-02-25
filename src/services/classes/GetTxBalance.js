import { bigNumberSum } from '../../lib/utils'
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
    return bigNumberSum(values.map(v => v.value))
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

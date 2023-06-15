import { bigNumberSum } from '../../lib/utils'
import { txRepository } from '../../repositories/tx.repository'
export class GetTxBalance {
  async getTxs (query) {
    // const projection = { value: 1 }
    let data = await txRepository.find(query, {})
      .catch(err => Promise.reject(err))
    return data
  }

  sumValues (values) {
    return bigNumberSum(values.map(v => v.value))
  }

  async getBalanceFromTx (address) {
    try {
      const { value: to } = await this.getTxs({ to: address })
      const { value: from } = await this.getTxs({ from: address })
      return (this.sumValues(to).minus(this.sumValues(from)))
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

import { DataCollectorItem } from '../lib/DataCollector'
import { contractsTypes, addrTypes } from '../lib/types'
import { GetTxBalance } from './getBalanceFromTxs'
export class Address extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { address: 1 }
    const Tx = this.parent.getItem({ key: 'Tx' })
    this.Tx = Tx
    this.getBalanceFromTxs = GetTxBalance(Tx)
    this.publicActions = {
      getAddress: async params => {
        const { address } = params
        const addressData = await this.getOne({ address })
        if (addressData.data) {
          const txBalance = await this.getBalanceFromTxs(address)
          if (txBalance) addressData.data.txBalance = this.serialize(txBalance)
        }
        return addressData
      },

      getAddresses: params => {
        let type = (params.query) ? params.query.type : null
        let query = (type) ? { type } : {}
        return this.getPageData(query, params)
      },

      getTokens: params => {
        return this.getPageData({
          type: addrTypes.CONTRACT,
          contractInterfaces: { $in: Object.values(contractsTypes) }
        }, params)
      }
    }
  }
}

export default Address

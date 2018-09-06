import { DataCollectorItem } from '../lib/DataCollector'
import { contractsTypes, addrTypes } from '../lib/types'
import { GetTxBalance } from './getBalanceFromTxs'

export class Address extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { address: 1 }
    this.Tx = this.parent.getItem({ key: 'Tx' })
    this.getBalanceFromTxs = GetTxBalance(this.parent.getItem({ key: 'Tx' }))
    this.publicActions = {
      getAddress: async params => {
        const address = params.address
        const addressData = await this.getOne({ address })
        if (addressData.data) {
          const txBalance = await this.getBalanceFromTxs(address)
          if (txBalance) addressData.data.txBalance = txBalance
        }
        return addressData
      },

      getAddresses: params => {
        return this.getPageData({}, params)
      },

      getTokens: params => {
        return this.getPageData({
          type: addrTypes.CONTRACT,
          contractType: contractsTypes.ERC20
        }, params)
      }
    }
  }
}

export default Address

import { DataCollectorItem } from '../lib/DataCollector'
import { contractsTypes, addrTypes } from '../lib/types'

export class Address extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { address: 1 }
    this.publicActions = {

      getAddress: params => {
        return this.getOne(params)
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

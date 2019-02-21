import { DataCollectorItem } from '../lib/DataCollector'
import { tokensInterfaces, addrTypes, REMASC_NAME, BRIDGE_NAME } from '../lib/types'
import config from '../lib/config'
const bridgeAddress = config.bridgeAddress
const remascAddress = config.remascAddress
export class Address extends DataCollectorItem {
  constructor (collection, key, parent) {
    let sortable = { 'createdByTx.timestamp': -1 }
    super(collection, key, parent, { sortDir: 1, sortable })
    const Tx = this.parent.getItem({ key: 'Tx' })
    this.Tx = Tx
    this.fields = { code: 0 }
    this.publicActions = {

      getAddress: async params => {
        const { address } = params
        const aData = await this.getOne({ address })
        if (aData.data) {
          if (!aData.data.name) {
            if (address === remascAddress) aData.data.name = REMASC_NAME
            if (address === bridgeAddress) aData.data.name = BRIDGE_NAME
          }
        }
        return aData
      },

      getAddresses: params => {
        let type = (params.query) ? params.query.type : null
        let query = (type) ? { type } : {}
        return this.getPageData(query, params)
      },

      getTokens: params => {
        return this.getPageData({
          type: addrTypes.CONTRACT,
          contractInterfaces: { $in: tokensInterfaces }
        }, params)
      }
    }
  }
}

export default Address

import { DataCollectorItem } from '../lib/DataCollector'

export class TokenAccount extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { address: 1 }
    this.publicActions = {

      getTokenAccounts: async params => {
        const contract = params.contract
        const data = await this.getPageData({ contract }, params)
        return this.parent.getAddress(params.address, data)
      },

      getTokenAccount: async params => {
        const address = params.address
        const contract = params.contract
        const data = await this.getOne({ address, contract })
        return this.parent.getAddress(address, data)
      }
    }
  }
}

export default TokenAccount

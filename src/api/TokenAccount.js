import { DataCollectorItem } from '../lib/DataCollector'

export class TokenAccount extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { address: 1 }
    this.publicActions = {

      getTokenAccounts: params => {
        const contract = params.contract || params.address
        if (contract) return this.getPageData({ contract }, params)
      },

      getContractAccount: params => {
        const { address, contract } = params
        return this.getOne({ address, contract })
      },

      getTokenAccount: async params => {
        const { address, contract } = params
        const account = await this.getOne({ address, contract })
        return this.parent.addAddressData(contract, account, '_contractData')
      }
    }
  }
}

export default TokenAccount

import { DataCollectorItem } from '../lib/DataCollector'
import { bigNumberSum } from '../lib/utils'
import { BigNumber } from 'bignumber.js'

export class TokenAccount extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.publicActions = {

      getTokenAccounts: params => {
        const contract = params.contract || params.address
        if (contract) return this.getPageData({ contract }, params)
      },

      getTokensByAddress: async params => {
        const address = params.address
        const from = this.parent.Address.db.collectionName
        if (address) {
          let aggregate = [
            { $match: { address } },
            {
              $lookup: { from, localField: 'contract', foreignField: 'address', as: 'addressesItems' }
            },
            { $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: ['$addressesItems', 0] }, '$$ROOT'] } } },
            { $project: { addressesItems: 0 } }
          ]
          let data = await this.getAggPageData(aggregate, params)
          return data
        }
      },

      getContractAccount: params => {
        const { address, contract } = params
        return this.getOne({ address, contract })
      },

      getTokenAccount: async params => {
        const { address, contract } = params
        const account = await this.getOne({ address, contract })
        return this.parent.addAddressData(contract, account, '_contractData')
      },

      getTokenBalance: async params => {
        const { contract } = params
        let contractData = await this.parent.getAddress(contract)
        contractData = contractData.data
        if (!contractData) return
        let { totalSupply } = contractData
        if (!totalSupply) return
        let accounts = await this.find({ contract })
        if (accounts) accounts = accounts.data
        if (!accounts) return

        let accountsBalance = bigNumberSum(accounts.map(account => account.balance))
        totalSupply = new BigNumber(totalSupply)
        let balance = (accountsBalance) ? totalSupply.minus(accountsBalance) : totalSupply

        const data = this.serialize({ balance, accountsBalance, totalSupply })
        return { data }
      }
    }
  }
}

export default TokenAccount

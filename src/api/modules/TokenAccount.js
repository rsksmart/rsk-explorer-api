import { DataCollectorItem } from '../lib/DataCollector'
import { bigNumberSum } from '../../lib/utils'
import { BigNumber } from 'bignumber.js'

export class TokenAccount extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.publicActions = {
      /**
       * @swagger
       * /api?module=tokens&action=getTokenAccounts:
       *    get:
       *      description: get token accounts
       *      tags:
       *        - tokens
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          default: tokens
       *        - name: action
       *          in: query
       *          required: true
       *          default: getTokenAccounts
       *        - $ref: '#/parameters/address'
       *      responses:
       *        400:
       *          description: invalid request
       *        404:
       *          description: unknown token
       *        200:
       *          description: accounts array
       *
      */
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
        const { contract, addresses } = params
        if (!contract) return

        let query = {}

        if (addresses) query = this.fieldFilterParse('address', addresses)

        let contractData = await this.parent.getAddress(contract)

        contractData = contractData.data
        if (!contractData) return

        let { totalSupply, decimals } = contractData
        if (!totalSupply) return

        query.contract = contract
        let accounts = await this.find(query, null, null, { _id: 0, address: 1, balance: 1 })
        if (accounts) accounts = accounts.data
        if (!accounts) return

        let accountsBalance = bigNumberSum(accounts.map(account => account.balance))
        totalSupply = new BigNumber(totalSupply)
        let balance = (accountsBalance) ? totalSupply.minus(accountsBalance) : totalSupply
        let data = { balance, accountsBalance, totalSupply, decimals }

        // send accounts
        if (addresses) data.accounts = accounts

        data = this.serialize(data)
        return { data }
      }
    }
  }
}

export default TokenAccount

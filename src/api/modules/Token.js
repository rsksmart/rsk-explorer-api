import { DataCollectorItem } from '../lib/DataCollector'
import { bigNumberSum } from '../../lib/utils'
import { BigNumber } from 'bignumber.js'
export class Token extends DataCollectorItem {
  constructor (key) {
    const cursorField = 'address'
    const sortable = { address: -1 }
    super(key, { cursorField, sortable })
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
       *          enum: [tokens]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getTokenAccounts]
       *        - $ref: '#/parameters/address'
       *        - $ref: '#/parameters/limit'
       *        - $ref: '#/parameters/next'
       *        - $ref: '#/parameters/prev'
       *      responses:
       *        200:
       *          $ref: '#/definitions/ResponseList'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getTokenAccounts: params => {
        const contract = params.contract || params.address
        if (contract) return this.getPageData({ contract }, params)
      },
      /**
       * @swagger
       * /api?module=tokens&action=getTokensByAddress:
       *    get:
       *      description: get token by address
       *      tags:
       *        - tokens
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [tokens]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getTokensByAddress]
       *        - $ref: '#/parameters/address'
       *        - $ref: '#/parameters/limit'
       *        - $ref: '#/parameters/next'
       *        - $ref: '#/parameters/prev'
       *      responses:
       *        200:
       *          $ref: '#/definitions/ResponseList'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getTokensByAddress: async params => {
        const address = params.address
        if (address) {
          const data = await this.getPageData({ address }, params, { isForGetTokensByAddress: true })
          return data
        }
      },
      /**
       * @swagger
       * /api?module=tokens&action=getContractAccount:
       *    get:
       *      description: get token account
       *      tags:
       *        - tokens
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [tokens]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getContractAccount]
       *        - $ref: '#/parameters/address'
       *        - $ref: '#/parameters/contract'
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getContractAccount: async params => {
        const query = {
          address: params.address || '',
          contract: params.contract
        }
        let { data } = await this.find(query, { blockNumber: -1 }, 1)

        return { data: (data[0] || null) }
      },
      /**
       * @swagger
       * /api?module=tokens&action=getTokenAccount:
       *    get:
       *      description: get token account and address data
       *      tags:
       *        - tokens
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [tokens]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getTokenAccount]
       *        - $ref: '#/parameters/address'
       *        - $ref: '#/parameters/contract'
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getTokenAccount: async params => {
        const { address, contract } = params
        const { data: [account] } = await this.find({ address: address || '', contract: contract || '' }, { blockNumber: -1 }, 1)

        const tokenAccount = await this.parent.addAddressData(contract, { data: account }, '_contractData')

        return tokenAccount
      },
      /**
       * @swagger
       * /api?module=tokens&action=getTokenBalance:
       *    get:
       *      description: get token balance
       *      tags:
       *        - tokens
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [tokens]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getTokenBalance]
       *        - $ref: '#/parameters/contract'
       *        - name: addresses
       *          in: query
       *          type: array
       *          required: false
       *          description: include only this addresses in balance
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
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
        let accounts = await this.find(query)
        let accountsBalance = '0x0'

        if (accounts) {
          // selects only the latest token balance for each account
          accounts = accounts.data.reduce((filteredAccounts, { address, balance, block: { number } }) => {
            if (filteredAccounts[address]) {
              if (number > filteredAccounts[address].number) {
                filteredAccounts[address].balance = balance
              }
            } else {
              filteredAccounts[address] = { address, balance, number }
            }

            return filteredAccounts
          }, {})

          accountsBalance = bigNumberSum(Object.keys(accounts).map(key => accounts[key].balance))
        }

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

export default Token

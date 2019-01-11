import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../lib/utils'

export class Tx extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { blockNumber: -1, transactionIndex: -1 }
    const PendingTxs = this.parent.getItem({ key: 'TxPending' })
    this.PendingTxs = PendingTxs.publicActions
    this.publicActions = {

      getTransactions: params => {
        let query = {}
        let txType = (params.query) ? params.query.txType : null
        if (txType) {
          query = this.fieldFilterParse('txType', txType)
        }
        return this.getPageData(query, params)
      },

      getTransaction: async params => {
        const hash = params.hash
        if (hash) {
          let tx
          tx = await this.getOne({ hash })
          if (!tx.data) tx = await this.PendingTxs.getPendingTransaction(params)
          return tx
        }
      },

      getTransactionsByBlock: params => {
        const hashOrNumber = params.hashOrNumber || params.number

        if (isBlockHash(hashOrNumber)) {
          params.blockHash = hashOrNumber
          return this.getTransactionsByBlockHash(params)
        } else {
          params.blockNumber = parseInt(hashOrNumber)
          return this.getTransactionsByBlockNumber(params)
        }
      },

      getTransactionsByAddress: params => {
        let address = params.address
        return this.getPageData(
          {
            $or: [{ from: address }, { to: address }]
          },
          params
        )
      }
    }
  }

  getTransactionsByBlockNumber (params) {
    const blockNumber = parseInt(params.blockNumber || params.number)
    if (undefined !== blockNumber) {
      return this.getPageData({ blockNumber }, params)
    }
  }

  getTransactionsByBlockHash (params) {
    const blockHash = params.blockHash
    if (blockHash) {
      return this.getPageData({ blockHash }, params)
    }
  }
}

export default Tx

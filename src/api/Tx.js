import { DataCollectorItem } from '../lib/DataCollector'

export class Tx extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { blockNumber: -1, transactionIndex: -1 }
    this.publicActions = {
      getTransactions: params => {
        let query = {}
        let txType = (params.query) ? params.query.txType : null
        if (txType) {
          query = this.fieldFilterParse('txType', txType)
        }
        return this.getPageData(query, params)
      },
      getTransaction2: params => {
        let hash = params.hash
        let sort = params.sort || this.sort
        return this.getPrevNext(
          params,
          { hash: hash },
          {},
          {},
          sort
        )
      },
      getTransaction: params => {
        let hash = params.hash
        let query = { hash }
        return this.db.findOne(query).then(tx => {
          if (!tx) return

          return this.getPrevNext(
            params,
            query,
            {
              $or: [
                { transactionIndex: { $gt: tx.transactionIndex } },
                { blockNumber: { $gte: tx.blockNumber } }
              ]
            },
            {
              $and: [
                { transactionIndex: { $lt: tx.transactionIndex } },
                { blockNumber: { $lte: tx.blockNumber } }
              ]
            },
            this.sort
          ).then(res => {
            // FIX IT
            res.NEXT = null
            res.PREV = null
            return res
          })
        })
      },
      getBlockTransactions: params => {
        let blockNumber = params.blockNumber
        if (undefined !== blockNumber) {
          return this.find({ blockNumber }, { transactionIndex: -1 })
        }
      },
      getAddressTransactions: params => {
        let address = params.address
        let Address = this.parent.Address
        return Address.run('getAddress', { address })
          .then((account) => {
            if (!account.DATA) return Promise.resolve(account)
            return this.getPageData(
              {
                $or: [{ from: address }, { to: address }]
              },
              params,
              { timestamp: -1 }
            ).then(res => {
              account.DATA.account = address
              res.PARENT_DATA = account.DATA
              return res
            })
          })
      }
    }
  }
}

export default Tx

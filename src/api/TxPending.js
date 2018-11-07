import { DataCollectorItem } from '../lib/DataCollector'

export class TxPending extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { timestamp: -1 }
    this.publicActions = {

      getPendingTransaction: params => {
        const hash = params.hash
        return this.getOne({ hash })
      },

      getPendingTransactionsByAddress: params => {
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
}

export default TxPending

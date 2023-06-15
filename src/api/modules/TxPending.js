import { DataCollectorItem } from '../lib/DataCollector'

export class TxPending extends DataCollectorItem {
  constructor (key) {
    super(key)
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

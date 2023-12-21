import { getInitConfig } from '../../lib/Setup'
import defaultConfig from '../../lib/defaultConfig'
import { TxPool } from '../../services/classes/TxPool'
import { DataCollectorItem } from '../lib/DataCollector'

export class TxPending extends DataCollectorItem {
  constructor (key) {
    const cursorField = 'hash'
    const sortable = { [cursorField]: -1 }
    super(key, { cursorField, sortable })
    this.publicActions = {
      startTxPool: async params => {
        let message = 'txPool control via endpoints is disabled'

        if (defaultConfig.enableTxPoolFromApi) {
          if (this.txPool && this.txPool.started) {
            message = 'TxPool already running'
          } else {
            const initConfig = await getInitConfig()
            this.txPool = new TxPool({ log: this.parent.log, initConfig })
            await this.txPool.start()
            message = 'TxPool started succesfully'
          }
          this.parent.log.info(message)
        }
        return { data: message }
      },
      stopTxPool: async params => {
        let message = 'txPool control via endpoints is disabled'

        if (defaultConfig.enableTxPoolFromApi) {
          if (!this.txPool) {
            message = 'txPool not started yet'
          } else {
            if (this.txPool.stopped) {
              message = 'TxPool already stopped'
            } else {
              this.txPool.stop()
              message = 'TxPool stopped succesfully'
            }
            this.parent.log.info(message)
          }
        }
        return { data: message }
      },
      getPendingTransaction: params => {
        const hash = params.hash
        return this.getOne({ hash })
      },

      getPendingTransactionsByAddress: params => {
        let address = params.address
        return this.getPageData(
          {
            OR: [{ from: address }, { to: address }]
          },
          params
        )
      }
    }
  }
}

export default TxPending

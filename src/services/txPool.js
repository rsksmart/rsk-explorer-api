import Logger from '../lib/Logger'
import { TxPool } from './classes/TxPool'

const log = Logger('[tx-pool-service]')

export async function txPool ({ initConfig }) {
  try {
    const txPool = new TxPool({ initConfig, log })
    txPool.start()
  } catch (err) {
    log.error(err)
    process.exit(9)
  }
}

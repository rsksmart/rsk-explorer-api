import Logger from '../lib/Logger'
import { getInitConfig } from '../lib/Setup'
import { TxPool } from './classes/TxPool'

const log = Logger('[tx-pool-service]')

export async function txPoolService () {
  try {
    const initConfig = await getInitConfig()
    const txPool = new TxPool({ initConfig, log })
    txPool.start()
  } catch (err) {
    log.error(err)
    process.exit(9)
  }
}

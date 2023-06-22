import { dataSource } from '../lib/dataSource'
import { TxPool } from './classes/TxPool'

export async function txPool ({ log }) {
  try {
    const { initConfig } = await dataSource()
    const txPool = new TxPool({ initConfig, log })
    txPool.start()
  } catch (err) {
    log.error(err)
    process.exit(9)
  }
}

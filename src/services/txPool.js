import { TxPool } from './classes/TxPool'

export async function txPool ({ initConfig, log }) {
  try {
    const txPool = new TxPool({ initConfig, log })
    txPool.start()
  } catch (err) {
    log.error(err)
    process.exit(9)
  }
}

import { dataSource } from '../../lib/dataSource'
import { TxPool } from '../classes/TxPool'

async function main () {
  try {
    const { db, initConfig } = await dataSource()
    const txPool = new TxPool(db, { initConfig })
    txPool.start()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

import { setup } from '../../lib/dataSource'
import { TxPool } from '../classes/TxPool'
import { createService, services } from '../serviceFactory'

const serviceConfig = services.TXPOOL

const executor = ({ create }) => { create.Emitter() }

async function main () {
  try {
    const { db, initConfig } = await setup()
    const { startService, log } = await createService(serviceConfig, executor)
    await startService()
    const txPool = new TxPool(db, { log, initConfig })
    log.info(`Starting txPool`)
    txPool.start()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

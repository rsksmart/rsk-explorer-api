import { TxPool } from '../classes/TxPool'
import { createService, services, bootStrapService } from '../serviceFactory'

const serviceConfig = services.TXPOOL

const executor = ({ create }) => { create.Emitter() }

async function main () {
  try {
    const { log, db, initConfig } = await bootStrapService(serviceConfig)
    const { startService } = await createService(serviceConfig, executor, { log })
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

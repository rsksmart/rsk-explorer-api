import { createService, services, bootStrapService } from '../serviceFactory'
import { ListenBlocks } from '../classes/ListenBlocks'

const serviceConfig = services.LISTENER
const executor = ({ create }) => { create.Emitter() }

async function main () {
  try {
    const { log, db, initConfig } = await bootStrapService(serviceConfig)
    const { service, startService } = await createService(serviceConfig, executor, { log })
    await startService()
    const listener = new ListenBlocks(db, { log, initConfig }, service)
    listener.start()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

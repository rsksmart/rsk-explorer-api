import { setup } from '../../lib/dataSource'
import { createService, services } from '../serviceFactory'
import { ListenBlocks } from '../classes/ListenBlocks'

const serviceConfig = services.LISTENER
const executor = ({ create }) => { create.Emitter() }

async function main () {
  try {
    const { db, initConfig } = await setup()
    const { service, startService, log } = await createService(serviceConfig, executor)
    await startService()
    const listener = new ListenBlocks(db, { log, initConfig }, service)
    listener.start()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

import { setup } from '../../lib/dataSource'
import { createService, services, createServiceLogger } from '../serviceFactory'
import { BlocksStatus } from '../classes/BlocksStatus'
import { events } from '../../lib/types'

const serviceConfig = services.STATUS

async function main () {
  try {
    const { db, initConfig } = await setup()
    const log = createServiceLogger(serviceConfig)
    const Status = new BlocksStatus(db, { log, initConfig })
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_STATUS:
          Status.update(data)
          break
      }
    }
    const executor = ({ create }) => { create.Listener(eventHandler) }
    const { startService } = await createService(serviceConfig, executor)
    await startService()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

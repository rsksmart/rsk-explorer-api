import { setup } from '../../lib/dataSource'
import { createService, services, createServiceLogger } from '../serviceFactory'
import { CheckBlocks } from '../classes/CheckBlocks'
import { events } from '../../lib/types'

const serviceConfig = services.CHECKER

async function main () {
  try {
    const { db, initConfig } = await setup()
    const log = createServiceLogger(serviceConfig)
    const checker = new CheckBlocks(db, { log, initConfig })
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_TIP_BLOCK:
          checker.updateTipBlock(data)
          break
      }
    }
    const executor = ({ create }) => {
      create.Emitter()
      create.Listener(eventHandler)
    }

    const { startService, service } = await createService(serviceConfig, executor, { log })
    const { emit } = service
    await startService()
    checker.start(emit)
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

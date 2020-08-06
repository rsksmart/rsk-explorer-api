import { createService, services, bootStrapService } from '../serviceFactory'
import { CheckBlocks } from '../classes/CheckBlocks'

const serviceConfig = services.CHECKER

async function main () {
  try {
    const { log, db, initConfig, events } = await bootStrapService(serviceConfig)
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
    setTimeout(() => checker.start(emit), 5000)
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

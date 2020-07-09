import { createService, services, bootStrapService } from '../serviceFactory'
import { UpdateBlockBalances } from '../classes/UpdateBlockBalances'

const serviceConfig = services.BALANCES

async function main () {
  try {
    const { log, db, initConfig, events } = await bootStrapService(serviceConfig)
    const balances = new UpdateBlockBalances(db, { log, initConfig })
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_TIP_BLOCK:
          balances.updateLastBlock(data)
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
    balances.setEmitter(emit)
    balances.start()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

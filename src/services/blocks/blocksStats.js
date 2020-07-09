import { createService, services, bootStrapService } from '../serviceFactory'
import { BcStats } from '../classes/BcStats'

const serviceConfig = services.STATS

async function main () {
  try {
    const { log, db, initConfig, events } = await bootStrapService(serviceConfig)
    const Stats = new BcStats(db, { log, initConfig })
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_TIP_BLOCK:
          Stats.update(data)
          break
      }
    }
    const executor = ({ create }) => { create.Listener(eventHandler) }
    const { startService } = await createService(serviceConfig, executor, { log })
    await startService()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

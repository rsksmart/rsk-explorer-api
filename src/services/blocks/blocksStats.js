import { setup } from '../../lib/dataSource'
import { createService, services, createServiceLogger } from '../serviceFactory'
import { BcStats } from '../classes/BcStats'
import { events } from '../../lib/types'

const serviceConfig = services.STATS

async function main () {
  try {
    const { db, initConfig } = await setup()
    const log = createServiceLogger(serviceConfig)
    const Stats = new BcStats(db, { log, initConfig })
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_TIP_BLOCK:
          Stats.update(data)
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

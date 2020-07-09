import { createService, services, bootStrapService } from '../serviceFactory'
import { RequestBlocks } from '../classes/RequestBlocks'
import config from '../../lib/config'

const serviceConfig = services.REQUESTER

async function main () {
  try {
    const { log, db, initConfig, events } = await bootStrapService(serviceConfig)
    const Requester = new RequestBlocks(db, Object.assign(Object.assign({}, config.blocks), { log, initConfig }))
    const eventHandler = async (event, data) => {
      try {
        switch (event) {
          case events.NEW_BLOCK:
            let { key, prioritize } = data
            Requester.request(key, prioritize)
            break

          case events.REQUEST_BLOCKS:
            const { blocks } = data
            Requester.bulkRequest(blocks)
            break
        }
      } catch (err) {
        return Promise.reject(err)
      }
    }
    const executor = ({ create }) => {
      create.Emitter()
      create.Listener(eventHandler)
    }

    const { startService, service } = await createService(serviceConfig, executor, { log })
    const { emit } = service
    Requester.setEmitter(emit)
    await startService()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()

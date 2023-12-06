
import { setup } from '../lib/dataSource.js'
import { Logger } from '../lib/Logger'
import { REPOSITORIES } from '../repositories/index.js'

const log = Logger('showTraces', { level: 'trace' })
const every = process.argv[2] || 10000

const { BlockTrace: blockTraceRepository } = REPOSITORIES

async function main () {
  try {
    await setup({ skipCheck: true })
    const traces = await blockTraceRepository.countDocuments({})
    log.info(`Traces: ${traces}`)
    setTimeout(main, every)
  } catch (err) {
    log.error(err)
    process.exit(9)
  }
}

main()

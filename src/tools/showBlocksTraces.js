
import { setup } from '../lib/dataSource.js'
import { Logger } from '../lib/Logger'
import { getDbBlocksCollections } from '../lib/blocksCollections'
const log = Logger('showTraces', { level: 'trace' })
const every = process.argv[2] || 10000

main()

async function main () {
  try {
    const { db } = await setup({ skipCheck: true })
    const collections = await getDbBlocksCollections(db)
    const collection = collections.BlocksTraces
    const traces = await collection.estimatedDocumentCount()
    log.info(`Traces: ${traces}`)
    setTimeout(main, every)
  } catch (err) {
    log.error(err)
    process.exit(9)
  }
}

import { dataBase } from '../../lib/dataSource.js'
import { BlocksBase } from '../../lib/BlocksBase'
import config from '../../lib/config'
import { deleteBlockDataFromDb } from '../../services/classes/Block'

dataBase.db().then(async db => {
  let blocks = new Set()
  let options = new BlocksBase(db)
  try {
    let collection = db.collection(config.blocks.collections.Events)
    console.log('getting events')
    let cursor = collection.find({})
    while (await cursor.hasNext()) {
      let event = await cursor.next()
      let { blockHash, blockNumber } = event
      blocks.add({ blockHash, blockNumber })
    }
    if (blocks.size > 0) {
      console.log(`Deleting ${blocks.size} blocks`)
      await Promise.all([...blocks.values()]
        .map(b => deleteBlockDataFromDb(b.blockHash, b.blockNumber, options.collections)))
    }
    console.log('DONE')
    process.exit(0)
  } catch (err) {
    console.error(err)
  }
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

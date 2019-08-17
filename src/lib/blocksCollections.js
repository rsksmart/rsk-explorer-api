import config from './config'
import { setup } from './dataSource'

export const getDbBlocksCollections = (db, names) => {
  names = names || config.collectionsNames
  let collections = {}
  for (let n in names) {
    collections[n] = db.collection(names[n])
  }
  return collections
}

export const blocksCollections = async () => {
  try {
    let { db } = await setup()
    return getDbBlocksCollections(db)
  } catch (err) {
    console.log(`Error getting collections ${err}`)
    console.log(err)
    process.exit(9)
  }
}

export default blocksCollections

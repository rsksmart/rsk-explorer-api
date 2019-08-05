import config from './config'
import dataSource from './dataSource'

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
    let { db } = await dataSource
    return getDbBlocksCollections(db)
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
}

export default blocksCollections

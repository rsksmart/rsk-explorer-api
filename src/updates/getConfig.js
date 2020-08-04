import config from '../lib/config'
import backupCollections from './backupCollections.json'
const what = process.argv[2]

let res
try {
  if (what === 'dbName') res = getDbName()
  if (what === 'collections') res = getCollections()
  if (!res) throw new Error('Empty result')
  console.log(res)
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(9)
}

function getDbName () {
  const dbName = config.db.database
  if (!dbName) throw new Error(`Invalid db Name ${dbName}`)
  return dbName
}

function getCollections () {
  const { collectionsNames } = config
  return Object.entries(collectionsNames)
    .filter(([coll, name]) => backupCollections.includes(coll))
    .map(([coll, name]) => name)
    .join(',')
}

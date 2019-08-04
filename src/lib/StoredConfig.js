
import config from './config'
const collectionName = config.collectionsNames.Config
const INIT_ID = '_explorerInitialConfiguration'

export function StoredConfig (db) {
  const storage = db.collection(collectionName)
  const get = async (_id) => {
    try {
      const doc = await storage.findOne({ _id })
      return doc
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const save = async doc => {
    try {
      const { _id } = doc
      if (!_id) throw new Error(`Invalid doc _id ${_id}`)
      const res = await storage.insert(doc)
      return res
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const saveConfig = doc => {
    doc._id = INIT_ID
    return save(doc)
  }
  const getConfig = () => {
    return get(INIT_ID)
  }
  return Object.freeze({ getConfig, saveConfig, save, get })
}

export default StoredConfig


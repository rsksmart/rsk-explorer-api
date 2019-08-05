
import config from './config'
const collectionName = config.collectionsNames.Config
const INIT_ID = '_explorerInitialConfiguration'
const readOnlyDocsIds = [INIT_ID]

export function StoredConfig (db) {
  const storage = db.collection(collectionName)
  const isReadOnly = _id => readOnlyDocsIds.includes(_id)
  const isValidId = id => typeof id === 'string'
  const get = async (_id) => {
    try {
      const doc = await storage.findOne({ _id })
      if (doc) {
        // Remove all underscored properties
        for (let prop in doc) {
          if (prop[0] === '_') delete doc[prop]
        }
      }
      return doc
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const save = async (id, doc) => {
    try {
      if (!id || !isValidId(id)) throw new Error(`Invalid id ${id}`)
      const newDoc = Object.assign({}, doc)
      newDoc._id = id
      newDoc._created = Date.now()
      const res = await storage.insertOne(newDoc)
      return res
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const update = async (_id, doc) => {
    try {
      if (!_id) throw new Error(`Missing doc._id`)
      if (isReadOnly(_id)) throw new Error(`The doc with _id ${_id} is read only`)
      let res = await storage.updateOne({ _id }, { $set: doc })
      return res
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const saveConfig = doc => {
    return save(INIT_ID, doc)
  }
  const getConfig = async () => {
    return get(INIT_ID)
  }

  return Object.freeze({ getConfig, saveConfig, save, get, update })
}

export default StoredConfig

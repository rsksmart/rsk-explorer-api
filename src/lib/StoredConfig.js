
import config from './config'
const collectionName = config.collectionsNames.Config

export function StoredConfig (db, readOnlyDocsIds = []) {
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
  const update = async (_id, doc, { create } = {}) => {
    try {
      if (!_id) throw new Error(`Missing doc._id`)
      if (isReadOnly(_id)) throw new Error(`The doc with _id ${_id} is read only`)
      const newDoc = Object.assign({}, doc)
      newDoc._updated = Date.now()
      const options = {}
      if (create) {
        let old = await get(_id)
        if (!old) return save(_id, doc)
      }
      let res = await storage.updateOne({ _id }, { $set: doc }, options)
      return res
    } catch (err) {
      return Promise.reject(err)
    }
  }

  return Object.freeze({ save, get, update })
}

export default StoredConfig

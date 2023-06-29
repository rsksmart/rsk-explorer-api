
import { configRepository } from '../repositories/config.repository'

export const readOnlyError = id => `The doc with _id ${id} is read only`

export function StoredConfig (readOnlyDocsIds = []) {
  const isReadOnly = _id => readOnlyDocsIds.includes(_id)
  const isValidId = id => typeof id === 'string'
  const get = async (_id) => {
    try {
      const doc = await configRepository.findOne({ _id }, {})
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
      if (isReadOnly(id)) {
        let exists = await get(id)
        if (exists) throw new Error(readOnlyError(id))
      }
      const newDoc = Object.assign({}, doc)
      newDoc._id = id
      newDoc._created = Date.now()
      const res = await configRepository.insertOne(newDoc)
      return res
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const update = async (_id, doc, { create } = {}) => {
    try {
      if (!_id) throw new Error(`Missing doc._id`)
      if (isReadOnly(_id)) throw new Error(readOnlyError(_id))
      const newDoc = Object.assign({}, doc)

      if (create) {
        let old = await get(_id)
        if (!old) return save(_id, newDoc)
      }
      newDoc._updated = Date.now()
      let res = await configRepository.updateOne({ _id }, newDoc)
      return res
    } catch (err) {
      return Promise.reject(err)
    }
  }

  return Object.freeze({ save, get, update })
}

export default StoredConfig

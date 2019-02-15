import { Collection, ObjectID } from 'mongodb'
import { find, findPages, aggregatePages } from './pagination'
import { OBJECT_ID } from '../../lib/types'
export class DataCollectorItem {
  constructor (collection, key, parent, { cursorField = '_id', sortDir = -1, sortable = { _id: -1 } } = {}) {
    if (!(collection instanceof Collection)) {
      throw (new Error('Collection is not mongodb Collection'))
    }
    this.db = collection
    this.key = key
    this.parent = parent
    this.fieldsTypes = null
    this.cursorField = cursorField
    this.cursorData = null
    this.sortDir = sortDir
    this.sortableFields = sortable
    this.sort = { [cursorField]: sortDir }
    this.publicActions = {}
    this.fields = {}
  }

  getDefaultsFields () {
    return Object.assign({}, this.fields)
  }
  async run (action, params) {
    try {
      const f = this.publicActions[action]
      if (f && typeof f === 'function') return f(params)
      else throw new Error(`Unknown action: ${action}`)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async find (query, sort, limit, project) {
    let collection = this.db
    project = project || this.getDefaultsFields()
    let data = await find(collection, query, sort, limit, project)
    return { data }
  }

  getOne (query, project) {
    project = project || this.getDefaultsFields()
    return this.db.findOne(query, project).then(data => {
      return { data }
    })
  }

  async setFieldsTypes () {
    let types = await getFieldsTypes(this.db)
    this.fieldsTypes = types
    return types
  }
  async getFieldsTypes () {
    let types = this.fieldsTypes
    return types || this.setFieldsTypes()
  }
  responseParams (params) {
    let sort = params.sort || this.sort || {}
    let sortable = this.sortableFields
    let defaultSort = this.sort
    let sortDir = this.sortDir

    let { limit, next, prev, fields, count, countOnly } = params
    if (!fields) fields = this.getDefaultsFields()
    sort = filterSort(sort, sortable, defaultSort)
    return { sort, sortable, defaultSort, sortDir, limit, next, prev, fields, count, countOnly }
  }

  async getCursorData () {
    let data = this.cursorData
    if (!data) data = await this.setCursorData()
    return data
  }

  async setCursorData () {
    const field = this.cursorField
    const types = await this.getFieldsTypes()
    const type = types[field]
    this.cursorData = { field, type }
    return this.cursorData
  }

  getPageData (query, params) {
    return this.getPages({ query, params })
  }

  getAggPageData (aggregate, params) {
    return this.getPages({ aggregate, params })
  }

  async getPrevNext (query, project, data) {
    try {
      let { cursorField } = this
      project = project || this.getDefaultsFields()
      if (!data) data = (await this.getOne(query)).data
      if (!data) return
      let value = query[cursorField] || data[cursorField]
      if (undefined === value) throw new Error(`Missing ${cursorField} value`)
      let prev = (await find(this.db, { [cursorField]: { $lt: value } }, { [cursorField]: -1 }, 1, project))[0]
      let next = (await find(this.db, { [cursorField]: { $gt: value } }, { [cursorField]: 1 }, 1, project))[0]
      return { prev, data, next }
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getPages ({ aggregate, query, params }) {
    try {
      let pages = this.responseParams(params)
      let cursorData = await this.getCursorData()
      query = aggregate || query
      let args = [this.db, cursorData, query, pages]
      let result = (aggregate) ? await aggregatePages(...args) : await findPages(...args)
      return formatResponse(result, pages)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  fieldFilterParse (field, value, query) {
    return fieldFilterParse(field, value, query)
  }
}

export function formatResponse (result, pages) {
  if (!result) return
  let { data, pagination } = result
  pages = Object.assign(pages, pagination)
  return { pages, data }
}

export async function getFieldsTypes (collection) {
  let doc = await collection.findOne()
  let fields = {}
  for (let p in doc) {
    let value = doc[p]
    let type = typeof value
    type = (value instanceof ObjectID) ? OBJECT_ID : type
    fields[p] = type
  }
  return fields
}

export function filterSort (sort, sortable, defaultSort) {
  let filteredSort = {}
  // allow only one field to user sort
  if (Object.keys(sort).length > 1) return defaultSort
  for (let field in sort) {
    if (undefined !== sortable[field]) filteredSort[field] = sort[field]
  }
  return (Object.keys(filteredSort).length > 0) ? filteredSort : defaultSort
}

// value: string| array of searched values | Object: 'value':true|false
export function fieldFilterParse (field, value, query) {
  query = query || {}
  let fieldQuery
  let inArr = []
  let ninArr = []
  if (typeof value === 'string') {
    fieldQuery = value
  } else if (Array.isArray(value)) {
    inArr = value
  } else if (typeof value === 'object') {
    for (let p in value) {
      if (value[p]) inArr.push(p)
      else ninArr.push(p)
    }
  }
  if (inArr.length || ninArr.length) fieldQuery = {}
  if (inArr.length) fieldQuery['$in'] = inArr
  if (ninArr.length) fieldQuery['$nin'] = ninArr
  if (fieldQuery) query[field] = fieldQuery
  return query
}

export default DataCollectorItem

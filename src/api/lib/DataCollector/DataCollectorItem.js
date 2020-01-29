import { Collection, ObjectID } from 'mongodb'
import { find, findPages, aggregatePages, countDocuments } from './pagination'
import { OBJECT_ID } from '../../../lib/types'
import { generateTextQuery } from './textSearch'

export class DataCollectorItem {
  constructor (collection, name, { cursorField = '_id', sortDir = -1, sortable = { _id: -1 } } = {}) {
    if (!(collection instanceof Collection)) {
      throw (new Error('Collection is not mongodb Collection'))
    }
    this.db = collection
    this.name = name
    this.fieldsTypes = null
    this.cursorField = cursorField
    this.cursorData = null
    this.sortDir = sortDir
    sortable[cursorField] = sortDir
    this.sortableFields = sortable
    this.sort = { [cursorField]: sortDir }
    this.publicActions = {}
    this.fields = {}
  }

  getName () {
    return this.name
  }

  getDefaultsFields () {
    return Object.assign({}, this.fields)
  }
  async run (action, params) {
    try {
      const f = this.publicActions[action]
      if (!f && typeof f !== 'function') throw new Error(`Unknow action: ${action}`)
      const result = await f(params)
      return result
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async count (query) {
    let collection = this.db
    let data = await countDocuments(collection, query)
    return { data }
  }

  async find (query, sort, limit, project) {
    let collection = this.db
    project = project || this.getDefaultsFields()
    let data = await find(collection, query, sort, limit, project)
    return { data }
  }

  async getOne (query, projection) {
    projection = projection || this.getDefaultsFields()
    const data = await this.db.findOne(query, { projection })
    return { data }
  }

  async getLatest (query, project) {
    query = query || {}
    const result = await find(this.db, query, this.sort, 1, project)
    return result.length ? result[0] : null
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

    let { limit, next, prev, fields, count, countOnly, page, getPages } = params
    if (!fields) fields = this.getDefaultsFields()
    sort = filterSort(sort, sortable, defaultSort)
    return { sort, sortable, defaultSort, sortDir, limit, next, prev, fields, count, countOnly, page, getPages }
  }

  async getCursorData () {
    let data = this.cursorData
    if (!data) data = await this.setCursorData()
    return data
  }

  async setCursorData () {
    let { cursorField } = this
    const types = await this.getFieldsTypes()
    this.cursorData = await getCursorData(this.db, cursorField, types)
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
      let { cursorField, db } = this
      project = project || this.getDefaultsFields()
      if (!data) data = (await this.getOne(query))
      if (data) data = data.data
      if (!data) return
      let value = query[cursorField] || data[cursorField]
      if (undefined === value) throw new Error(`Missing ${cursorField} value`)
      let prev = (await find(db, { [cursorField]: { $lt: value } }, { [cursorField]: -1 }, 1, project))[0]
      let next = (await find(db, { [cursorField]: { $gt: value } }, { [cursorField]: 1 }, 1, project))[0]
      return { prev, data, next }
    } catch (err) {
      return Promise.reject(err)
    }
  }
  /**
   *  Resolves item query parsing params
   * @param {*} query 
   * @param {*} params 
   */
  async getItem (query, { fields, getPrevNext }) {
    try {
      let data = await this.getOne(query, fields)
      if (getPrevNext) {
        data = await this.getPrevNext(query, fields, data)
      }
      return data
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

  async textSearch (value, params) {
    try {
      if (typeof value !== 'string') throw new Error('The text search requires an string value')
      let query = generateTextQuery(value, params)
      return this.find(query)
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
  if (!field || !value || typeof field !== 'string') return query
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

export async function getCursorData (collection, cursorField, types) {
  types = types || await getFieldsTypes(collection)
  const cursorType = types[cursorField]
  return { cursorField, cursorType, fields: types }
}

export default DataCollectorItem

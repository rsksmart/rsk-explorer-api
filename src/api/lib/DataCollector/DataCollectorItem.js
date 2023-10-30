import { find, findPages } from './pagination'
import { REPOSITORIES } from '../../../repositories'

export class DataCollectorItem {
  constructor (name, { cursorField = '_id', sortDir = -1, sortable = { _id: -1 } } = {}) {
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
    this.repository = REPOSITORIES[name]
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
    let data = await this.repository.countDocuments(query)
    return { data }
  }

  async find (query, sort, limit, project, endpointOptions = {}) {
    project = project || this.getDefaultsFields()
    let data = await find(query, sort, limit, project, this.repository, endpointOptions)
    return { data }
  }

  async getOne (query, projection, sort, endpointOptions) {
    projection = projection || this.getDefaultsFields()
    sort = sort || this.sort
    const data = await this.repository.findOne(query, { projection, sort }, endpointOptions)
    return { data }
  }

  async getLatest (query, project) {
    query = query || {}
    const result = await find(query, this.sort, 1, project, this.repository)
    const data = result.length ? result[0] : null
    return { data }
  }

  async setFieldsTypes () {
    let types = await getFieldsTypes(this.repository)
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

    // fields = parseFields(fields)
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
    this.cursorData = await getCursorData(cursorField, types, this.repository)
    return this.cursorData
  }

  getPageData (query, params, endpointOptions = {}) {
    return this.getPages({ query, params, endpointOptions })
  }

  async getPrevNext (query, project, data) {
    try {
      let { cursorField } = this
      project = project || this.getDefaultsFields()
      if (!data) data = await this.getOne(query)
      if (data) data = data.data
      if (!data) return
      let value = query[cursorField] || data[cursorField]
      if (undefined === value) throw new Error(`Missing ${cursorField} value`)
      let prev = (await find({ [cursorField]: { lt: value } }, { [cursorField]: -1 }, 1, project, this.repository))[0]
      let next = (await find({ [cursorField]: { gt: value } }, { [cursorField]: 1 }, 1, project, this.repository))[0]
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

  async getPages ({ query, params, endpointOptions }) {
    try {
      let pages = this.responseParams(params)
      let cursorData = await this.getCursorData()

      let args = [cursorData, query, pages, this.repository, endpointOptions]
      let result = await findPages(...args)
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

export async function getFieldsTypes (repository) {
  const doc = await repository.findOne({}, {})

  const fields = {}
  for (let p in doc) {
    const value = doc[p]
    let type = typeof value
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

  if (inArr.length) fieldQuery['in'] = inArr

  if (ninArr.length) fieldQuery.notIn = ninArr

  if (fieldQuery) query[field] = fieldQuery

  return query
}

export async function getCursorData (cursorField, types, repository) {
  types = types || await getFieldsTypes(repository)
  const cursorType = types[cursorField]
  return { cursorField, cursorType, fields: types }
}

export default DataCollectorItem

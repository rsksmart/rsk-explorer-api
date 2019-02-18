import { OBJECT_ID } from '../../lib/types'
import { ObjectID } from 'mongodb'
import config from '../../lib/config'
const { MAX_LIMIT, MAX_PAGES } = config.api

export function generateCursorQuery ({ cursorField, sortDir, value }) {
  const op = (sortDir === -1) ? '$lt' : '$gt'
  return (value) ? { [cursorField]: { [op]: value } } : null
}

export function formatSearchValue (type, value) {
  if (value !== null && value !== undefined) {
    if (type === 'number') value = parseInt(value)
    if (type === OBJECT_ID) value = new ObjectID(value)
  }
  return value
}

export function generateSort ({ cursorField, sort, sortDir }) {
  // UNCOMPLETED
  let cSort = Object.assign({}, sort)
  cSort[cursorField] = sortDir
  return cSort
}

export function generateQuery (params, query = {}) {
  let cursorQuery = generateCursorQuery(params)
  if (!cursorQuery || Object.keys(cursorQuery) < 1) return query
  return (query && Object.keys(query).length > 0) ? { $and: [cursorQuery, query] } : cursorQuery
}

export function parseParams (cursorData, params) {
  params = Object.assign({}, params)
  params.sort = params.sort || {}
  const cursorField = cursorData.field
  const cursorType = cursorData.type
  let { sortDir, prev, next, sort, count, countOnly, limit, getPages, page, prevPage } = params

  count = count || countOnly
  limit = limit || 50
  page = parseInt(page)
  page = (page > 0) ? page : 1

  let indexedPages = Math.floor(MAX_LIMIT / limit)
  if (MAX_PAGES && indexedPages > MAX_PAGES) indexedPages = MAX_PAGES
  const indexedSegment = Math.floor((page - 1) / indexedPages)

  let queryLimit = (getPages) ? indexedPages * limit : limit
  sortDir = (sortDir === 1) ? 1 : -1
  sortDir = (sort[cursorField]) ? sort[cursorField] : sortDir
  let backwardNav = !!prev || !!prevPage
  if (backwardNav) {
    sortDir = (sortDir === 1) ? -1 : 1
  }
  let value = (backwardNav) ? prev : next
  value = formatSearchValue(cursorType, value)
  params = Object.assign(params, {
    sortDir,
    backwardNav,
    value,
    limit,
    cursorField,
    cursorData,
    count,
    queryLimit,
    getPages,
    page,
    indexedPages,
    indexedSegment
  })
  return params
}

export async function findPages (collection, cursorData, query, params) {
  try {
    params = parseParams(cursorData, params)
    const { fields, count, countOnly, queryLimit } = params
    const $query = generateQuery(params, query)

    const $sort = generateSort(params)
    let data = (!countOnly) ? await find(collection, $query, $sort, queryLimit + 1, fields) : null
    let total = (count) ? (await collection.countDocuments(query)) : null
    return paginationResponse(params, data, total)
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function aggregatePages (collection, cursorData, query, params) {
  try {
    params = parseParams(cursorData, params)
    const { fields, count, countOnly, queryLimit } = params
    let match = generateQuery(params)
    const sort = generateSort(params)
    const aggregate = modifyAggregate(query, { match, sort, limit: queryLimit + 1, fields })
    let data = (!countOnly) ? await collection.aggregate(aggregate).toArray() : null
    let total = (count) ? await getAggregateTotal(collection, query) : null
    return paginationResponse(params, data, total)
  } catch (err) {
    return Promise.reject(err)
  }
}

export function modifyAggregate (query, { match, sort, limit, fields }) {
  let aggregate = [...query]
  let index = aggregate.findIndex(v => v.$match)
  index = (index > -1) ? index : aggregate.unshift(null)

  let mm = (aggregate[index]) ? aggregate[index].$match : null
  let $match = (mm) ? { $and: [match, mm] } : match
  aggregate[index] = { $match }
  index++

  if (sort) {
    aggregate.splice(index, 0, { $sort: sort })
    index++
  }

  if (limit) aggregate.splice(index, 0, { $limit: limit })
  return aggregate
}

export async function getAggregateTotal (collection, query) {
  const aggregate = [...query]
  try {
    aggregate.push({
      $group: { _id: 'result', total: { $sum: 1 } }
    })
    let res = await collection.aggregate(aggregate).toArray()
    return (res && res[0]) ? res[0].total : 0
  } catch (err) {
    return Promise.reject(err)
  }
}

export function paginationResponse (params, data, total) {
  total = total || null
  const { indexedPages, limit, cursorField, getPages, indexedSegment, page, value, queryLimit } = params
  let pages = []

  const hasMore = data.length > queryLimit
  const hasPrevious = !!params.next || !!(params.prev && hasMore)

  let totalPages = data.length / limit
  totalPages = (hasMore) ? Math.floor(totalPages) : Math.ceil(totalPages)

  if (hasMore) data.pop()
  if (params.prev) data.reverse()

  const prev = (hasPrevious) ? data[0][cursorField] : null
  const next = (!!params.prev || hasMore) ? data[data.length - 1][cursorField] : null
  let nextPage, prevPage

  if (getPages) {
    let pageNumber
    for (let i = 0; i < totalPages; i++) {
      pageNumber = (indexedSegment * indexedPages) + i
      let pageData = { page: (pageNumber + 1) }
      if (params.next) pageData.next = value
      else if (params.prev) pageData.prev = value
      pages.push(pageData)
    }

    let skip = (parseInt((page - 1).toString().split('').pop())) * limit
    if (next) {
      nextPage = { next, page: pageNumber + 2 }
      pages.push(nextPage)
    }
    if (prev) {
      prevPage = { prev, page: pages[0].page - 1 }
    }
    data = data.splice(skip, limit)
  }

  const pagination = { limit, total, next, prev, page, pages, nextPage, prevPage }
  return { pagination, data }
}

export async function find (collection, query, sort, limit, project) {
  sort = sort || {}
  project = project || {}
  limit = limit || 0
  let data = await collection
    .find(query)
    .project(project)
    .sort(sort)
    .limit(limit)
    .toArray()
    .catch((err) => {
      return Promise.reject(err)
    })
  return data
}

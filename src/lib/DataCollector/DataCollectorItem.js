import { Collection } from 'mongodb'
export class DataCollectorItem {
  constructor (collection, key, parent, { cursorField = '_id', sortable = { _id: -1 }, sort = { _id: -1 } } = {}) {
    if (!(collection instanceof Collection)) {
      throw (new Error('Collection is not mongodb Collection'))
    }
    this.db = collection
    this.key = key
    this.parent = parent
    this.cursorField = cursorField
    this.sortableFields = sortable
    this.sort = sort
    this.publicActions = {}
  }
  run (action, params) {
    let f = this.publicActions[action]
    if (f) {
      return f(params)
    } else {
      console.log('Unknown action' + action)
    }
  }
  paginator (query, params) {
    return this.db.countDocuments(query).then(total => {
      let pages = Math.ceil(total / params.limit)
      return { total, pages }
    })
  }
  getPages (query, params) {
    return this.db.countDocuments(query, { hint: '_id_' }).then(total => {
      return this._pages(params, total)
    })
  }
  getAggPages (aggregate, params) {
    return new Promise((resolve, reject) => {
      aggregate.push({
        $group: { _id: 'result', total: { $sum: 1 } }
      })
      // review this
      // let options = { allowDiskUse: true }
      let options = {}
      this.db.aggregate(aggregate, options, (err, cursor) => {
        if (err) reject(err)
        cursor.toArray().then(res => {
          let total = res.length ? res[0].total : 0
          resolve(this._pages(params, total))
        })
      })
    })
  }

  _pages (params, total) {
    let page = 1
    let skip = 0
    let pages = 1
    let perPage = params.limit || 10
    if (total) {
      page = params.page > 0 ? params.page : 1
      pages = Math.ceil(total / perPage)
      page = page * perPage < total ? page : pages
      skip = (page - 1) * perPage
    }
    return { page, total, pages, perPage, skip }
  }
  _formatPrevNext (prev, data, next) {
    return { prev, data, next }
  }
  getOne (query, projection) {
    return this.db.findOne(query, projection).then(data => {
      return { data }
    })
  }
  find (query, sort, limit) {
    sort = sort || {}
    limit = limit || 0
    return this.db
      .find(query)
      .sort(sort)
      .limit(limit)
      .toArray()
      .then(data => {
        return { data }
      })
  }
  getPrevNext (params, query, queryP, queryN, sort) {
    return this._findPN(query, sort).then(data => {
      if (data) {
        let jsonData = JSON.stringify(data)
        return this._findPN(queryP, sort).then(prev => {
          if (jsonData === JSON.stringify(prev)) prev = null
          return this._findPN(queryN, sort).then(next => {
            if (jsonData === JSON.stringify(next)) next = null
            return { data, next, prev }
          })
        })
      }
    })
  }
  _findPN (query, sort) {
    return this.db
      .find(query)
      .sort(sort)
      .limit(1)
      .toArray()
      .then(res => {
        return res[0]
      })
  }
  _findPages (query, pages, sort) {
    const options = {}
    if (pages.skip) options.skip = pages.skip
    return this.db
      .find(query, options)
      .sort(sort)
      .limit(pages.perPage)
      .toArray()
  }
  _aggregatePages (aggregate, pages) {
    // review this
    let options = {}
    // options.allowDiskUse = true
    aggregate.push({ $skip: pages.skip })
    aggregate.push({ $limit: pages.perPage })
    return this.db.aggregate(aggregate, options).toArray()
  }

  getAggPageData (aggregate, params) {
    let sort = params.sort || this.sort
    return this.getAggPages(aggregate.concat(), params).then(pages => {
      if (sort) {
        aggregate.push({ $sort: sort })
      }
      return this._aggregatePages(aggregate, pages).then(data => {
        return { pages, data }
      })
    })
  }

  async getPageData (query, params) {
    let sort = params.sort || this.sort || {}
    let sortable = this.sortableFields
    sort = this.filterSort(sort, sortable)
    let pages = await this.getPages(query, params)
    pages.sort = sort
    pages.sortable = sortable
    pages.defaultSort = this.sort
    let data = await this._findPages(query, pages, sort)
    return { pages, data }
  }

  filterSort (sort, sortable) {
    let filteredSort = {}
    sortable = sortable || this.sortableFields
    // allow only one field to user sort
    if (Object.keys(sort).length > 1) return this.sort
    for (let field in sort) {
      if (undefined !== sortable[field]) filteredSort[field] = sort[field]
    }
    return (Object.keys(filteredSort).length > 0) ? filteredSort : this.sort
  }
  // value: string| array of searched values | Object: 'value':true|false
  fieldFilterParse (field, value, query) {
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
}
export default DataCollectorItem

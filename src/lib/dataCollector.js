import { EventEmitter } from 'events'
import { clearInterval } from 'timers'
class Emitter extends EventEmitter { }
const emitter = new Emitter()

export class DataCollector {
  constructor(db, options) {
    this.db = db
    this.options = options
    this.collection = null
    this._keyName = options.keyName || '_id'
    this.events = emitter
    this._interval = null
    this.items = {}
    this.perPage = options.perPage || 50
    this.setCollection(options.collectionName)
  }
  tick () { }
  stop () {
    if (this._interval) {
      this._interval = clearInterval(this._interval)
    }
  }
  start () {
    if (!this._interval) {
      this._interval = setInterval(() => {
        this.tick()
      }, 1000)
    }
  }
  setCollection (collectionName, name = 'collection') {
    if (collectionName && !this[name])
      this[name] = this.db.collection(collectionName)
  }
  getItem (params) {
    let key = params.key || params[this._keyName]
    if (key) return this.items[key]
  }
  run () { }
  itemPublicAction (action, params, item) {
    return new Promise((resolve, reject) => {
      if (!action) reject('Missing action')
      if (!params) reject('No params provided')
      if (item === '*') {
        //find item
        item = null
        item = this.searchItemByAction(action)
      } else {
        item = item || this.getItem(params)
      }
      if (action && item) {
        let method = item.publicActions[action]
        if (method) {
          resolve(method(this.filterParams(params)))
        } else {
          reject('Unknown method ' + action)
        }
      }
      reject('Unknown action or bad params requested, action:' + action)
    })
  }
  searchItemByAction (action) {
    for (let i in this.items) {
      let item = this.items[i]
      if (item.publicActions[action]) return item
    }
  }
  addItem (collectionName, key, itemClass, addToRoot) {
    if (collectionName && key) {
      itemClass = itemClass || DataCollectorItem
      if (!this.items[key]) {
        let collection = this.db.collection(collectionName)
        if (collection) {
          let item = new itemClass(collection, key, this)
          this.items[key] = item
          if (addToRoot) {
            if (!this[key]) this[key] = item
            else console.log(`Error key: ${key} exists`)
          }
        }
      } else {
        console.log('Error the key: ' + key + ' already exists')
      }
    }
  }

  filterParams (params) {
    let page = params.page || 1
    let perPage = this.perPage
    params.page = page
    let limit = params.limit || perPage
    limit = limit <= perPage ? limit : perPage
    params.limit = limit
    return params
  }

  formatData (data) {
    return { DATA: data }
  }
}

export class DataCollectorItem {
  constructor(collection, key, parent) {
    this.db = collection
    this.key = key
    this.publicActions = {}
    this.parent = parent
  }
  paginator (query, params) {
    return this.db.count(query).then(total => {
      let pages = Math.ceil(total / params.limit)
      return { total, pages }
    })
  }
  getPages (query, params) {
    return this.db.count(query).then(total => {
      return this._pages(params, total)
    })
  }
  getAggPages (aggregate, params) {
    return new Promise((resolve, reject) => {
      aggregate.push({
        $group: { _id: 'result', TOTAL: { $sum: 1 } }
      })
      // review this
      let options = { allowDiskUse: true }
      this.db.aggregate(aggregate, options, (err, cursor) => {
        if (err) reject(err)
        cursor.toArray().then(res => {
          let total = res[0].TOTAL
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
  _formatPrevNext (PREV, DATA, NEXT) {
    return { PREV, DATA, NEXT }
  }
  getOne (query) {
    return this.db.findOne(query).then(DATA => {
      return { DATA }
    })
  }
  find (query) {
    return this.db
      .find(query)
      .toArray()
      .then(DATA => {
        return { DATA }
      })
  }
  getPrevNext (params, query, queryP, queryN, sort) {
    return this._findPN(query, sort).then(DATA => {
      if (DATA) {
        let jsonData = JSON.stringify(DATA)
        return this._findPN(queryP, sort).then(PREV => {
          if (jsonData == JSON.stringify(PREV)) PREV = null
          return this._findPN(queryN, sort).then(NEXT => {
            if (jsonData == JSON.stringify(NEXT)) NEXT = null
            return { DATA, NEXT, PREV }
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
  _findPages (query, PAGES, sort) {
    return this.db
      .find(query)
      .sort(sort)
      .skip(PAGES.skip)
      .limit(PAGES.perPage)
      .toArray()
  }
  _aggregatePages (aggregate, PAGES) {
    // review this
    let options = {}
    // options.allowDiskUse = true
    aggregate.push({ $skip: PAGES.skip })
    aggregate.push({ $limit: PAGES.perPage })
    return this.db.aggregate(aggregate, options).toArray()
  }

  getAggPageData (aggregate, params, sort) {
    return this.getAggPages(aggregate.concat(), params).then(PAGES => {
      if (sort) aggregate.push({ $sort: sort })
      return this._aggregatePages(aggregate, PAGES).then(DATA => {
        console.log(PAGES, DATA)
        return { PAGES, DATA }
      })
    })
  }
  getPageData (query, params, sort) {
    sort = sort || { _id: -1 }
    return this.getPages(query, params).then(PAGES => {
      return this._findPages(query, PAGES, sort).then(DATA => {
        return { PAGES, DATA }
      })
    })
  }
  // value: string| array of searched values | Object: 'value':true|false
  fieldFilterParse (field, value, query) {
    query = query || {}
    let fieldQuery
    let inArr = []
    let ninArr = []
    if ('string' === typeof (value)) {
      fieldQuery = value
    } else if (Array.isArray(value)) {
      inArr = value
    } else if ('object' === typeof (value)) {
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
export default DataCollector

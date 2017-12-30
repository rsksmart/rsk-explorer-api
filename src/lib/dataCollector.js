import { EventEmitter } from 'events'
import { clearInterval } from 'timers'
class Emitter extends EventEmitter {}
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
  tick() {}
  stop() {
    if (this._interval) {
      this._interval = clearInterval(this._interval)
    }
  }
  start() {
    if (!this._interval) {
      this._interval = setInterval(() => {
        this.tick()
      }, 1000)
    }
  }
  setCollection(collectionName) {
    if (collectionName) this.collection = this.db.collection(collectionName)
  }
  getItem(params) {
    let key = params.key || params[this._keyName]
    if (key) return this.items[key]
  }
  run() {}
  itemPublicAction(action, params, item) {
    return new Promise((resolve, reject) => {
      if (!action) reject('Missing action')
      if (!params) reject('No params provided')
      item = item || this.getItem(params)
      if (action && item) {
        let method = item.publicActions[action]
        if (method) {
          resolve(method(this.filterParams(params)))
        }
      }
      reject('Unknown action or bad params requested')
    })
  }
  addItem(collectionName, key, itemClass) {
    if (collectionName && key) {
      itemClass = itemClass || DataCollectorItem
      if (!this.items[key]) {
        let collection = this.db.collection(collectionName)
        if (collection) {
          this.items[key] = new itemClass(collection, key)
        }
      } else {
        console.log('Error the key: ' + key + ' already exists')
      }
    }
  }

  filterParams(params) {
    let page = params.page || 1
    let perPage = this.perPage
    params.page = page
    let limit = params.limit || perPage
    limit = limit <= perPage ? limit : perPage
    params.limit = limit
    return params
  }

  formatData(data) {
    return { DATA: data }
}
}

export class DataCollectorItem {
  constructor(collection, key) {
    this.db = collection
    this.key = key
    this.publicActions = {}
  }
  paginator(query, params) {
    return this.db.count(query).then(total => {
      let pages = Math.ceil(total / params.limit)
      return { total, pages }
    })
  }
  getPages(query, params) {
    return this.db.count(query).then(total => {
      return this._pages(params, total)
    })
  }
  getAggPages(aggregate, params) {
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

  _pages(params, total) {
    let perPage = params.limit
    let page = params.page > 0 ? params.page : 1
    let pages = Math.ceil(total / perPage)
    page = page * perPage < total ? page : pages
    let skip = (page - 1) * perPage
    return { page, total, pages, perPage, skip }
  }
  getOne(query) {
    return this.db.findOne(query).then(DATA => {
      return { DATA }
    })
  }
  getOnePrevNext(query, queryPrev, queryNext) {
    return this.getOne(query).then(res => {
      if (res) {
        console.log(res)
        return this.getOne(queryPrev).then(prev => {
          res.PREV = prev && prev.DATA ? prev.DATA : null
          return this.getOne(queryNext).then(next => {
            res.NEXT = next && next.DATA ? next.DATA : null
            return res
          })
        })
      }
    })
  }
  _find(query, PAGES, sort) {
    return this.db
      .find(query)
      .sort(sort)
      .skip(PAGES.skip)
      .limit(PAGES.perPage)
      .toArray()
  }
  _aggregate(aggregate, PAGES) {
    // review this
    let options = { allowDiskUse: true }
    return this.db
      .aggregate(aggregate, options)
      .skip(PAGES.skip)
      .limit(PAGES.perPage)
      .toArray()
  }

  getAggPageData(aggregate, params, sort) {
    return this.getAggPages(aggregate.concat(), params).then(PAGES => {
      if (sort) aggregate.push({ $sort: sort })
      return this._aggregate(aggregate, PAGES).then(DATA => {
        return { PAGES, DATA }
      })
    })
  }
  getPageData(query, params, sort) {
    sort = sort || { _id: -1 }
    return this.getPages(query, params).then(PAGES => {
      return this._find(query, PAGES, sort).then(DATA => {
        return { PAGES, DATA }
      })
    })
  }
}
export default DataCollector

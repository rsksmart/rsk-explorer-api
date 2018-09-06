import { EventEmitter } from 'events'
import { clearInterval } from 'timers'
import { filterParams, serialize } from '../utils'
import { Db } from 'mongodb'
import DataCollectorItem from './DataCollectorItem'
class Emitter extends EventEmitter { }
const emitter = new Emitter()

export class DataCollector {
  constructor (db, options) {
    if (!(db instanceof Db)) { throw (new Error('Db is not mongodb Db')) }
    this.db = db
    this.options = options
    this.collection = null
    this._keyName = options.keyName || '_id'
    this.events = emitter
    this._interval = null
    this.items = {}
    this.perPage = options.perPage || 50
    this.setCollection(options.collectionName)
    this.tickDelay = 1000
    this.serialize = serialize
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
      }, this.tickDelay)
    }
  }

  setCollection (collectionName, name = 'collection') {
    if (collectionName && !this[name]) {
      this[name] = this.db.collection(collectionName)
    }
  }

  getItem (params) {
    let key = params.key || params[this._keyName]
    if (key) return this.items[key]
  }

  run () { }

  itemPublicAction (action, params, item) {
    return new Promise((resolve, reject) => {
      if (!action) reject(new Error('Missing action'))
      if (!params) reject(new Error('No params provided'))
      if (item === '*') {
        // find item
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
          return reject(new Error('Unknown method ' + action))
        }
      }
      return reject(new Error('Unknown action or bad params requested, action:' + action))
    })
  }

  searchItemByAction (action) {
    for (let i in this.items) {
      let item = this.items[i]
      if (item.publicActions[action]) return item
    }
  }

  addItem (collectionName, key, ItemClass, addToRoot) {
    if (collectionName && key) {
      ItemClass = ItemClass || DataCollectorItem
      if (!this.items[key]) {
        let collection = this.db.collection(collectionName)
        if (collection) {
          let item = new ItemClass(collection, key, this)
          item.serialize = this.serialize
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
    return filterParams(params, this.perPage)
  }

  formatData (data) {
    return { data: data }
  }
}

export default DataCollector

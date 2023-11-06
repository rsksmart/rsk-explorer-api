import { EventEmitter } from 'events'
import { clearInterval } from 'timers'
import { serialize } from '../../../lib/utils'
import { filterParams } from '../apiTools'

class Emitter extends EventEmitter { }
const emitter = new Emitter()

export class DataCollector {
  constructor (options) {
    this.options = options
    this.events = emitter
    this._interval = null
    this.modules = {}
    this.tickDelay = 15000
    this.serialize = serialize
    this.log = null
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

  run () { }

  addModule (module, name) {
    try {
      name = name || module.getName()
      if (!name) throw new Error(`Invalid module name ${name}`)
      if (this.modules[name]) throw new Error(`The module: ${name} already exists`)
      module.serialize = this.serialize
      module.parent = this
      this.modules[name] = module
    } catch (err) {
      this.log.warn(err)
      throw err
    }
  }

  getModule (name) {
    const module = this.modules[name]
    // if (!module) throw new Error(`Unknown module ${name}`)
    return module
  }

  filterParams (params) {
    return filterParams(params)
  }

  formatData (data) {
    return { data }
  }
}

export default DataCollector

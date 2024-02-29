import { events, actions } from './types'
import { nod3Router, nod3Log } from './nod3Connect'
import config from '../lib/config'

export default class BlocksBase {
  constructor ({ initConfig = {}, log = console, debug = config.blocks.debug, nod3 = nod3Router } = {}) {
    if (debug) nod3.setDebug(nod3Log(log))
    this.log = log
    this.initConfig = initConfig
    this.net = this.initConfig.net
    this.nod3 = nod3
    this.events = events
    this.actions = actions
    this.emit = (event) => this.log.warn(`Event ${event} received but emitter is not defined`)
  }

  setEmitter (emitter) {
    if (typeof emitter !== 'function') throw new Error('The emitter must be a function')
    this.emit = emitter
  }

  getBlockData ({ number, hash, parentHash }) {
    return { number, hash, parentHash }
  }
}

import { events, actions } from './types'
import { nod3Router as nod3, nod3Log } from './nod3Connect'
import NativeContracts from './NativeContracts'
import config from '../lib/config'

export class BlocksBase {
  constructor (options = {}) {
    let { initConfig, log, debug } = options
    if (undefined === debug) debug = config.blocks.debug
    this.initConfig = initConfig || {}
    this.nod3 = options.nod3 || nod3
    log = options.log || console
    this.log = log
    if (debug) nod3.setDebug(nod3Log(log))
    this.events = events
    this.actions = actions
    this.nativeContracts = NativeContracts(initConfig)
    this.net = this.initConfig.net
    this.emit = (event) => {
      this.log.warn(`Event ${event} received but emitter is not defined`)
    }
  }
  setEmitter (emitter) {
    if (typeof emitter !== 'function') throw new Error('The emitter must be a function')
    this.emit = emitter
  }
  getBlockData (block) {
    let { number, hash, parentHash } = block
    return { number, hash, parentHash }
  }
}

export default BlocksBase

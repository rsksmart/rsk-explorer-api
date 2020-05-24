import { getDbBlocksCollections } from './blocksCollections'
import { events, actions } from './types'
import { nod3Router as nod3, nod3Log } from './nod3Connect'
import NativeContracts from './NativeContracts'

export class BlocksBase {
  constructor (db, { log, initConfig, debug } = {}) {
    this.initConfig = initConfig || {}
    this.db = db
    this.collections = (db) ? getDbBlocksCollections(db) : undefined
    this.nod3 = nod3
    log = log || console
    this.log = log
    if (debug) nod3.setDebug(nod3Log(log))
    this.et = events
    this.actions = actions
    this.nativeContracts = NativeContracts(initConfig)
    this.net = this.initConfig.net
  }
}

export default BlocksBase

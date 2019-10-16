import { getDbBlocksCollections } from './blocksCollections'
import { events, actions } from './types'
import nod3 from './nod3Connect'
import NativeContracts from './NativeContracts'

export class BlocksBase {
  constructor (db, { log, initConfig }) {
    this.initConfig = initConfig || {}
    this.db = db
    this.collections = (db) ? getDbBlocksCollections(db) : undefined
    this.nod3 = nod3
    this.log = log || console
    this.et = events
    this.actions = actions
    this.nativeContracts = NativeContracts(initConfig)
    this.net = this.initConfig.net
  }
}

export default BlocksBase

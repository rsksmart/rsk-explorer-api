import { getDbBlocksCollections } from './blocksCollections'
import { events, actions } from './types'
import nod3 from './nod3Connect'

export class BlocksBase {
  constructor (db, { log, nativeContracts }) {
    this.db = db
    this.collections = (db) ? getDbBlocksCollections(db) : undefined
    this.nod3 = nod3
    this.log = log || console
    this.et = events
    this.actions = actions
    this.nativeContracts = nativeContracts
  }
}

export default BlocksBase

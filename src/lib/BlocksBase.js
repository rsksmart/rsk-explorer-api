import web3 from './web3Connect'
import { getDbBlocksCollections } from './blocksCollections'

export class BlocksBase {
  constructor (db, options) {
    options = options || {}
    this.db = db
    this.collections = getDbBlocksCollections(db)
    this.web3 = web3
    this.log = options.Logger || console
  }
}

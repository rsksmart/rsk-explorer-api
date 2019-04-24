import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../../lib/utils'
export class Block extends DataCollectorItem {
  constructor (collection, key, parent) {
    let cursorField = 'number'
    let sortDir = -1
    let sortable = { timestamp: -1 }
    super(collection, key, parent, { sortDir, cursorField, sortable })
    this.publicActions = {

      getBlock: params => {
        const hashOrNumber = params.hashOrNumber || params.hash || params.number
        let query = {}
        if (isBlockHash(hashOrNumber)) {
          query = { hash: hashOrNumber }
        } else {
          query = { number: parseInt(hashOrNumber) }
        }
        return this.getPrevNext(query, { number: 1 })
      },

      getBlocks: params => {
        return this.getPageData({}, params)
      }
    }
  }
}

export default Block

import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../lib/utils'
export class Block extends DataCollectorItem {
  constructor (collection, key, parent) {
    let sort = { number: -1 }
    let cursorField = 'number'
    super(collection, key, parent, { sort, cursorField })
    this.publicActions = {

      getBlock: async params => {
        const hashOrNumber = params.hashOrNumber || params.hash || params.number
        if (isBlockHash(hashOrNumber)) {
          const block = await this.getOne({ hash: hashOrNumber })
          if (block && block.data) return this.getBlockNextPrev(block.data.number, params)
        } else {
          const number = parseInt(hashOrNumber)
          return this.getBlockNextPrev(number, params)
        }
      },

      getBlocks: params => {
        return this.getPageData({}, params)
      }
    }
  }
  getBlockNextPrev (number, params) {
    return this.getPrevNext(
      params,
      { number: number },
      { number: { $lte: number - 1 } },
      { number: { $lte: number + 1 } },
      this.sort)
  }
}

export default Block

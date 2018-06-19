import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../lib/utils'
export class Block extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { number: -1 }
    this.publicActions = {

      getBlock: async params => {
        const hashOrNumber = params.hashOrNumber || params.number
        if (isBlockHash(hashOrNumber)) {
          const block = await this.getOne({ hash: hashOrNumber })
          if (block) return this.getBlockNextPrev(block.DATA.number, params)
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

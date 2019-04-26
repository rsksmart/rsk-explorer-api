import { DataCollectorItem } from '../lib/DataCollector'

export class Stats extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.publicActions = {

      getStats: params => {
        return this.getPageData({}, params)
      },
      getLatest: () => {
        return this.getOne()
      }
    }
  }
}

export default Stats

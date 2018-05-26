import { DataCollectorItem } from '../lib/DataCollector'
export class Event extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { address: 1 }
    this.publicActions = {

      getEvent: async params => {
        const _id = params.id
        const address = params.address
        const data = await this.getOne({ _id })
        return this.parent.getAddress(address, data)
      },

      getEvents: async params => {
        const address = params.address
        const data = await this.getPageData({ address }, params)
        return this.parent.getAddress(address, data)
      }
    }
  }
}

export default Event

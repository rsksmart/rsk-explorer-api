import { DataCollectorItem } from '../lib/DataCollector'
export class Event extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.sort = { address: 1 }
    this.publicActions = {

      getEvent: async params => {
        const _id = params.id
        const data = await this.getOne({ _id })
        const address = data.data.address
        return this.parent.addAddressData(address, data)
      },

      getEventsByAddress: async params => {
        const address = params.address
        if (address) return this.getPageData({ address }, params)
      }
    }
  }
}

export default Event

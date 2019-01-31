import { DataCollectorItem } from '../lib/DataCollector'
export class Event extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
    this.publicActions = {

      getEvent: async params => {
        try {
          const eventId = params.eventId
          const data = await this.getOne({ eventId })
          if (!data) throw new Error(`Event ${eventId} does not exist`)
          const address = data.data.address
          return this.parent.addAddressData(address, data)
        } catch (err) {
          return Promise.resolve(err)
        }
      },

      getEventsByAddress: async params => {
        const address = params.address
        if (address) return this.getPageData({ address }, params)
      }
    }
  }
}

export default Event

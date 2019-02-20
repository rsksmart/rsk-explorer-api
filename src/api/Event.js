import { DataCollectorItem } from '../lib/DataCollector'
export class Event extends DataCollectorItem {
  constructor (collection, key, parent) {
    const sortable = { timestamp: -1 }
    super(collection, key, parent, { sortable })
    this.publicActions = {

      getEvent: async params => {
        try {
          const _id = params._id
          let data = await this.getOne({ _id })
          if (!data) throw new Error(`Event ${_id} does not exist`)
          const address = data.data.address
          data = await this.parent.addAddressData(address, data)
          return data
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

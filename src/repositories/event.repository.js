import { generateFindQuery } from './utils'
import {rawEventToEntity, eventEntityToRaw} from '../converters/event.converters'
import { eventRelatedTables } from './includeRelatedTables'

export function getEventRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const event = await prismaClient.event.findFirst(generateFindQuery(query, project, eventRelatedTables, project))

      return event ? eventEntityToRaw(event) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const events = await prismaClient.event.findMany(generateFindQuery(query, project, eventRelatedTables, sort, limit))

      return events.map(eventEntityToRaw)
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.event.count({where: query})
      return count
    },
    insertOne (event) {
      const involvedAddresses = event._addresses.map(address => ({ address, isEventEmitterAddress: false }))
      involvedAddresses.push({ address: event.address, isEventEmitterAddress: true })

      const query = prismaClient.event.create({
        data: {
          ...rawEventToEntity(event),
          address_in_event: {
            createMany: {
              data: involvedAddresses,
              skipDuplicates: true
            }
          }
        }
      })

      return [query]
    },
    async deleteMany (filter) {
      const deleted = await prismaClient.event.deleteMany({where: filter})

      return deleted
    }
  }
}

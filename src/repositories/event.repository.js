import { generateFindQuery } from './utils'
import {rawEventToEntity, eventEntityToRaw} from '../converters/event.converters'
import { eventRelatedTables } from './includeRelatedTables'

export function getEventRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const event = await prismaClient.event.findFirst(generateFindQuery(query, project, eventRelatedTables, project))

      return event ? eventEntityToRaw(event) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, { isForGetEventsByAddress }) { // sort = { [cursorField]: sortDir }
      if (isForGetEventsByAddress) {
        const relations = {
          // get event
          event: {
            include: {
              // get involved addresses
              address_in_event: true
            }
          }
        }
        const eventsByAddress = await prismaClient.address_in_event.findMany(generateFindQuery(query, {}, relations, sort, limit))

        return eventsByAddress.map(eventByAddress => eventEntityToRaw(eventByAddress.event))
      } else {
        const events = await prismaClient.event.findMany(generateFindQuery(query, project, eventRelatedTables, sort, limit))
        return events.map(eventEntityToRaw)
      }
    },
    async countDocuments (query = {}, { isForGetEventsByAddress } = {}) {
      if (isForGetEventsByAddress) {
        return prismaClient.address_in_event.count({ where: query })
      } else {
        return prismaClient.event.count({ where: query })
      }
    },
    insertOne (event) {
      const involvedAddresses = event._addresses.map(address => ({ address, isEventEmitterAddress: false, eventSignature: event.signature }))
      involvedAddresses.push({ address: event.address, isEventEmitterAddress: true, eventSignature: event.signature })

      return prismaClient.event.create({
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
    },
    upsertOne (event) {
      const involvedAddresses = event._addresses.map(address => ({ address, isEventEmitterAddress: false, eventSignature: event.signature }))
      involvedAddresses.push({ address: event.address, isEventEmitterAddress: true, eventSignature: event.signature })

      return prismaClient.event.upsert({
        where: { eventId: event.eventId },
        create: {
          ...rawEventToEntity(event),
          address_in_event: {
            createMany: {
              data: involvedAddresses,
              skipDuplicates: true
            }
          }
        },
        update: {
          ...rawEventToEntity(event),
          address_in_event: {
            createMany: {
              data: involvedAddresses,
              skipDuplicates: true
            }
          }
        }
      })
    },
    async deleteMany (query) {
      return prismaClient.event.deleteMany({ where: query })
    }
  }
}

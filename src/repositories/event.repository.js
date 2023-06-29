import { prismaClient } from '../lib/Setup'
import { generateFindQuery } from './utils'
import saveAbiAndGetId from './tx.repository'
import {rawEventToEntity, eventEntityToRaw} from '../converters/event.converters'
import { eventRelatedTables } from './includeRelatedTables'

export const eventRepository = {
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
  insertOne (data) {
    const {_addresses, abi, args, topics, eventId} = data
    const transactionQueries = []

    if (abi) {
      const {transactionQueries: abiQueries, abiId} = saveAbiAndGetId(abi)
      data.abiId = abiId
      transactionQueries.push(...abiQueries)
    }

    transactionQueries.push(prismaClient.event.createMany({data: [rawEventToEntity(data)], skipDuplicates: true}))

    const addressesToSave = _addresses.map(address => ({address, eventId}))
    transactionQueries.push(prismaClient.address_in_event.createMany({data: addressesToSave, skipDuplicates: true}))

    const topicsToSave = topics.map(topic => ({topic, eventId}))
    transactionQueries.push(prismaClient.event_topic.createMany({data: topicsToSave, skipDuplicates: true}))

    if (args) {
      const argsToSave = args.map(arg => ({arg, eventId}))
      transactionQueries.push(prismaClient.event_arg.createMany({data: argsToSave, skipDuplicates: true}))
    }

    return transactionQueries
  },
  async deleteMany (filter) {
    const deleted = await prismaClient.event.deleteMany({where: filter})

    return deleted
  }
}

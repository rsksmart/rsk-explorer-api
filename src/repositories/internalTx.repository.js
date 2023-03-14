import { rawActionToEntity, rawInternalTransactionResultToEntity, rawInternalTransactionToEntity } from '../converters/internalTx.converters'
import {prismaClient} from '../lib/Setup'

export const internalTxRepository = {
  findOne (query = {}, project = {}, collection) {
    return collection.findOne(query, project)
  },
  find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    if (isArray) {
      return collection
        .find(query, project)
        .sort(sort)
        .limit(limit)
        .toArray()
    } else {
      return collection
        .find(query, project)
        .sort(sort)
        .limit(limit)
    }
  },
  countDocuments (query = {}, collection) {
    return collection.countDocuments(query)
  },
  aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async deleteMany (filter, collection) {
    const mongoRes = await collection.deleteMany(filter)
    return mongoRes
  },
  async insertOne (data, collection) {
    const {action, traceAddress, result} = data
    const internalTxToSave = rawInternalTransactionToEntity(data)

    const createdAction = await prismaClient.action.create({data: rawActionToEntity(action)})
    internalTxToSave.actionId = createdAction.id

    if (result) {
      const createdResult = await prismaClient.internal_transaction_result.create({data: rawInternalTransactionResultToEntity(result)})
      internalTxToSave.resultId = createdResult.id
    }

    await prismaClient.internal_transaction.create({data: internalTxToSave})

    const traceAddressToSave = traceAddress.map((trace, index) => {
      return {
        internalTxId: internalTxToSave.internalTxId,
        trace,
        index
      }
    })

    await prismaClient.trace_address.createMany({data: traceAddressToSave})

    const mongoRes = await collection.insertOne(data)
    return mongoRes
  }
}

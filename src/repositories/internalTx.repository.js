import {
  internalTxEntityToRaw,
  rawActionToEntity,
  rawInternalTransactionResultToEntity,
  rawInternalTransactionToEntity
} from '../converters/internalTx.converters'
import {prismaClient} from '../lib/Setup'
import { generateFindQuery, mongoQueryToPrisma } from './utils'

const internalTxRelatedTables = {
  action: true,
  internal_transaction_result: true,
  trace_address: {
    select: {
      trace: true
    },
    orderBy: {
      index: 'asc'
    }
  }
}

export const internalTxRepository = {
  async findOne (query = {}, project = {}, collection) {
    const internalTx = await prismaClient.internal_transaction.findFirst(generateFindQuery(query, project, internalTxRelatedTables, project))

    return internalTx ? internalTxEntityToRaw(internalTx) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const internalTxs = await prismaClient.internal_transaction.findMany(generateFindQuery(query, project, internalTxRelatedTables, sort, limit))

    return internalTxs.map(itx => internalTxEntityToRaw(itx))
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.internal_transaction.count({
      where: mongoQueryToPrisma(query)
    })

    return count
  },
  async deleteMany (filter, collection) {
    if (filter.transactionHash.$in) {
      if (filter.transactionHash.$in.length > 0) {
        filter.transactionHash.in = filter.transactionHash.$in
      } else {
        filter.transactionHash.in = []
      }

      delete filter.transactionHash.$in
    }

    const itxsToDelete = await prismaClient.internal_transaction.findMany({ where: filter })

    await prismaClient.internal_transaction.deleteMany({ where: filter })

    const deletedItxsData = await Promise.all(itxsToDelete.map(async (itx) => {
      const { actionId, resultId } = itx

      await prismaClient.action.deleteMany({ where: { id: actionId } })
      await prismaClient.internal_transaction_result.deleteMany({ where: { id: resultId } })

      return itx
    }))

    // mongo
    filter.transactionHash.$in = filter.transactionHash.in
    delete filter.transactionHash.in
    await collection.deleteMany(filter)

    return deletedItxsData
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

    const { internalTxId } = internalTxToSave
    const savedInternalTx = await this.findOne({ internalTxId }, {}, collection)

    await collection.insertOne(data)
    return savedInternalTx
  }
}

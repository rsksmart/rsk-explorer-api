import {prismaClient} from '../lib/Setup'
import {
  rawTxToEntity,
  rawReceiptToEntity,
  rawLogToEntity,
  rawLogTopicToEntity,
  rawLogArgToEntity,
  rawLoggedAddressToEntity,
  transactionEntityToRaw
} from '../converters/tx.converters'
import {
  rawAbiToEntity,
  rawAbiInputToEntity
} from '../converters/abi.converters'
import {
  generateFindQuery,
  mongoQueryToPrisma
} from './utils'
import { txRelatedTables } from './includeRelatedTables'

function saveAbiAndGetId (abi) {
  const {inputs} = abi
  const abiToSave = rawAbiToEntity(abi)
  const transactionQueries = [prismaClient.abi.createMany({data: [abiToSave], skipDuplicates: true})]

  if (inputs) {
    const inputsToSave = inputs.map(input => {
      input.abiId = abiToSave.id
      return rawAbiInputToEntity(input)
    })
    transactionQueries.push(prismaClient.abi_input.createMany({data: inputsToSave, skipDuplicates: true}))
  }

  return {transactionQueries, abiId: abiToSave.id}
}

export const txRepository = {
  async findOne (query = {}, project = {}, collection) {
    const txToReturn = await prismaClient.transaction.findFirst(generateFindQuery(query, project, txRelatedTables, project))

    return txToReturn ? transactionEntityToRaw(txToReturn) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const txs = await prismaClient.transaction.findMany(generateFindQuery(query, project, txRelatedTables, sort, limit))

    return txs.map(transactionEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.transaction.count({where: mongoQueryToPrisma(query)})

    return count
  },
  async deleteMany (filter, collection) {
    const deleted = await prismaClient.transaction.deleteMany({where: mongoQueryToPrisma(filter)})

    return deleted
  },
  insertOne (data, collection) {
    const {logs} = data.receipt
    const transactionQueries = [
      prismaClient.transaction.create({data: rawTxToEntity(data)}),
      prismaClient.receipt.create({data: rawReceiptToEntity(data.receipt)})
    ]

    for (const log of logs) {
      const {abi, topics, args, transactionHash, logIndex, _addresses} = log

      if (abi) {
        const {transactionQueries: abiQueries, abiId} = saveAbiAndGetId(abi)
        log.abiId = abiId
        transactionQueries.push(...abiQueries)
      }

      transactionQueries.push(prismaClient.log.createMany({data: [rawLogToEntity(log)], skipDuplicates: true}))

      const topicsToSave = topics.map((topic, topicIndex) => rawLogTopicToEntity({ topicIndex, topic, transactionHash, logIndex }))
      transactionQueries.push(prismaClient.log_topic.createMany({data: topicsToSave, skipDuplicates: true}))

      if (args) {
        const argsToSave = args.map(arg => (rawLogArgToEntity({arg, transactionHash, logIndex})))
        transactionQueries.push(prismaClient.log_arg.createMany({data: argsToSave, skipDuplicates: true}))
      }

      const loggedAddressesToSave = _addresses.map(address => rawLoggedAddressToEntity({address, transactionHash, logIndex}))
      transactionQueries.push(prismaClient.logged_address.createMany({data: loggedAddressesToSave, skipDuplicates: true}))
    }

    return transactionQueries
  }
}

export default saveAbiAndGetId

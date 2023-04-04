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
  rawInputToEntity,
  rawAbiInputToEntity
} from '../converters/abi.converters'
import {
  createPrismaOrderBy,
  mongoQueryToPrisma,
  createPrismaSelect
} from './utils'

const txRelatedTables = {
  receipt: {
    include: {
      log: {
        include: {
          abi_log_abiToabi: {include: {abi_input: {select: {input: {select: {name: true, type: true, indexed: true}}}}}},
          log_topic: {select: {topic: true}, orderBy: { topicIndex: 'asc' }},
          log_arg: {select: {arg: true}},
          logged_address: {select: {address: true}}
        }
      }
    }
  }
}

async function saveAbiAndGetId (abi) {
  const {inputs} = abi
  const abiToSave = rawAbiToEntity(abi)
  let existingAbi = await prismaClient.abi.findFirst({where: abiToSave})

  if (!existingAbi) {
    existingAbi = await prismaClient.abi.create({data: abiToSave})
  }

  if (inputs) {
    for (const input of inputs) {
      let existingInput = await prismaClient.input.findFirst({where: {name: input.name, type: input.type}})
      if (!existingInput) {
        existingInput = await prismaClient.input.create({data: rawInputToEntity(input)})
      }
      existingInput.abiId = existingAbi.id
      const abiInputToSave = rawAbiInputToEntity(existingInput)
      let existingAbiInput = await prismaClient.abi_input.findFirst({where: {name: abiInputToSave.name, abiId: abiInputToSave.abiId}})
      if (!existingAbiInput) {
        await prismaClient.abi_input.create({data: abiInputToSave})
      }
    }
  }

  return existingAbi.id
}

export const txRepository = {
  async findOne (query = {}, project = {}, collection) {
    const txToReturn = await prismaClient.transaction.findFirst({
      where: mongoQueryToPrisma(query),
      orderBy: createPrismaOrderBy(project),
      include: txRelatedTables
    })

    return txToReturn ? transactionEntityToRaw(txToReturn) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const txs = await prismaClient.transaction.findMany({
      where: mongoQueryToPrisma(query),
      select: createPrismaSelect(project),
      orderBy: createPrismaOrderBy(sort),
      take: limit
    })

    return txs.map(transactionEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.transaction.count({where: mongoQueryToPrisma(query)})

    return count
  },
  aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async deleteMany (filter, collection) {
    await collection.deleteMany(filter)
    const deleted = await prismaClient.transaction.deleteMany({where: mongoQueryToPrisma(filter)})

    return deleted
  },
  async insertOne (data, collection) {
    await prismaClient.transaction.create({data: rawTxToEntity(data)})
    await prismaClient.receipt.create({data: rawReceiptToEntity(data.receipt)})

    const {logs} = data.receipt

    for (const log of logs) {
      const {abi, topics, args, transactionHash, logIndex, _addresses} = log
      if (abi) {
        log.abiId = await saveAbiAndGetId(abi)
      }

      await prismaClient.log.create({data: rawLogToEntity(log)})

      for (const [topicIndex, topic] of topics.entries()) {
        const newLogTopic = rawLogTopicToEntity({ topicIndex, topic, transactionHash, logIndex })
        await prismaClient.log_topic.upsert({
          where: { logIndex_topicIndex_topic_transactionHash: newLogTopic },
          create: newLogTopic,
          update: newLogTopic
        })
      }

      if (args) {
        for (const arg of args) {
          await prismaClient.log_arg.create({data: rawLogArgToEntity({arg, transactionHash, logIndex})})
        }
      }

      for (const address of _addresses) {
        await prismaClient.logged_address.create({data: rawLoggedAddressToEntity({address, transactionHash, logIndex})})
      }
    }

    const mongoRes = await collection.insertOne(data)
    return mongoRes
  }
}

export default saveAbiAndGetId

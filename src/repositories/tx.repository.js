import {prismaClient} from '../lib/Setup'
import {rawTxToEntity, rawReceiptToEntity, rawLogToEntity, rawLogTopicToEntity, rawLogArgToEntity, rawLoggedAddressToEntity, entityTransactionToRaw} from '../converters/tx.converters'
import {rawAbiToEntity, rawInputToEntity, rawAbiInputToEntity} from '../converters/abi.converters'
import { mongoSortToPrisma } from './utils'

export const txRepository = {
  async  findOne (query = {}, project = {}, collection) {
    let orderBy = []
    if (project.sort) {
      const sort = Object.entries(project.sort)[0]
      let param = sort[0]
      const value = mongoSortToPrisma(sort[1])

      const prismaSort = {
        [param]: value
      }
      orderBy.push(prismaSort)
    }

    let requestedTransaction = await prismaClient.transaction.findFirst({
      where: query,
      orderBy: orderBy,
      include: {
        receipt: {
          include: {
            log: {
              include: {
                abi_log_abiToabi: {
                  include: {
                    abi_input: {select: {input: true}}
                  }
                },
                log_topic: {select: {topic: true}},
                log_arg: {select: {arg: true}},
                logged_address: {select: {address: true}}
              }
            }
          }
        }
      }
    })

    return requestedTransaction ? entityTransactionToRaw(requestedTransaction) : null
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
    return prismaClient.transaction.count({where: query})
  },
  aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async deleteMany (filter, collection) {
    const mongoRes = await collection.deleteMany(filter)
    return mongoRes
  },
  async insertOne (data, collection) {
    await prismaClient.transaction.create({data: rawTxToEntity(data)})
    await prismaClient.receipt.create({data: rawReceiptToEntity(data.receipt)})

    const {logs} = data.receipt

    for (const log of logs) {
      const {abi, topics, args, transactionHash, logIndex, _addresses} = log
      let existingAbi
      if (abi) {
        const {inputs} = abi
        const abiToSave = rawAbiToEntity(abi)
        existingAbi = await prismaClient.abi.findFirst({where: abiToSave})
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
        log.abiId = existingAbi.id
      }

      await prismaClient.log.create({data: rawLogToEntity(log)})

      for (const topic of topics) {
        await prismaClient.log_topic.create({data: rawLogTopicToEntity({topic, transactionHash, logIndex})})
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

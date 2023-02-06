import {prismaClient} from '../lib/Setup'
import {rawTxToEntity, rawReceiptToEntity, rawLogToEntity, rawLogTopicToEntity, rawLogArgToEntity, rawLoggedAddressToEntity} from '../converters/tx.converters'
import {rawAbiToEntity, rawInputToEntity, rawAbiInputToEntity} from '../converters/abi.converters'

export const txRepository = {
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
  deleteMany (filter, collection) {
    return collection.deleteMany(filter)
  },
  async insertOne (data, collection) {
    try {
      const thisType = {
        type: data.txType,
        entity: 'transaction'
      }
      let existingType = await prismaClient.type.findFirst({where: thisType})
      if (!existingType) {
        existingType = await prismaClient.type.create({data: thisType})
      }
      await prismaClient.transaction.create({data: rawTxToEntity({txTypeId: existingType.id, ...data})})

      await prismaClient.receipt.create({data: rawReceiptToEntity(data.receipt)})

      const {logs} = data.receipt

      for (const log of logs) {
        const {abi, topics, args, transactionHash, logIndex, _addresses} = log

        if (abi) {
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
              await prismaClient.abi_input.create({data: rawAbiInputToEntity({abiId: existingAbi.id, ...existingInput})})
            }
          }
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
    } catch (e) {
      console.log(e)
    }
    const mongoRes = await collection.insertOne(data)

    return mongoRes
  }
}

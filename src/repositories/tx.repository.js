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
  async deleteMany (filter, collection) {
    await prismaClient.transaction.deleteMany({where: {hash: {in: filter.$in}}})

    const mongoRes = await collection.deleteMany(filter)
    return mongoRes
  },
  async insertOne (data, collection) {
<<<<<<< Updated upstream
    const thisType = {
      type: data.txType,
      entity: 'transaction'
    }
    let existingType = await prismaClient.type.findFirst({where: thisType})
    if (!existingType) {
      existingType = await prismaClient.type.create({data: thisType})
    }
    await prismaClient.transaction.create({data: rawTxToEntity({txTypeId: existingType.id, ...data})})
=======

      await prismaClient.transaction.create({data: rawTxToEntity(data)})
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
      for (const address of _addresses) {
        await prismaClient.logged_address.create({data: rawLoggedAddressToEntity({address, transactionHash, logIndex})})
      }
    }

=======
>>>>>>> Stashed changes
    const mongoRes = await collection.insertOne(data)

    return mongoRes
  }
}

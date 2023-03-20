import {prismaClient} from '../lib/Setup'
import {rawAddressToEntity, rawContractToEntity} from '../converters/address.converters'

export const addressRepository = {
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
  async updateOne (filter, update, options = {}, collection) {
    const {$set: data} = update
    const addressToSave = rawAddressToEntity(data)
    await prismaClient.address.upsert({ where: filter, update: addressToSave, create: addressToSave })

    if (data.type === 'contract') {
      const {createdByTx, createdByInternalTx, contractMethods, contractInterfaces} = data

      if (createdByTx) {
        if (createdByTx.transactionHash) {
          data.createdByInternalTx = createdByTx.transactionHash
          delete data.createdByTx
        } else if (createdByTx.hash) {
          data.createdByTx = createdByTx.hash
        }
      } else if (createdByInternalTx) {
        data.createdByInternalTx = createdByInternalTx
        delete data.createdByTx
      }

      const contractToSave = rawContractToEntity(data)
      const savedContract = await prismaClient.contract.upsert({where: {address: contractToSave.address}, create: contractToSave, update: contractToSave})

      if (contractMethods) {
        for (const method of contractMethods) {
          const savedMethod = await prismaClient.method.upsert({where: {method}, create: {method}, update: {method}})
          await prismaClient.contract_method.create({data: {methodId: savedMethod.id, contractAddress: savedContract.address}})
        }
      }

      if (contractInterfaces) {
        for (const interf of contractInterfaces) {
          const savedInterface = await prismaClient.interface_.upsert({where: {interface: interf}, create: {interface: interf}, update: {interface: interf}})
          await prismaClient.contract_interface.create({data: {interfaceId: savedInterface.id, contractAddress: savedContract.address}})
        }
      }
    }

    const mongoRes = await collection.updateOne(filter, update, options)
    return mongoRes
  },
  async deleteMany (filter, collection) {
    const mongoRes = await collection.deleteMany(filter)
    return mongoRes
  },
  insertOne (data, collection) {
    return collection.insertOne(data)
  }
}

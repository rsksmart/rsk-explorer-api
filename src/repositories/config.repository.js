import { rawConfigToEntity, rawConfigUpdateToEntity, rawNativeContractToEntity, rawNetToEntity } from '../converters/config.converters'
import { prismaClient } from '../lib/Setup'

const isReadOnly = id => id === '_explorerInitialConfiguration'

export const configRepository = {
  async findOne (query = {}, project = {}, collection) {
    const docId = query._id

    let existingConfig = await prismaClient.explorer_config.findFirst({
      where: { id: docId },
      select: { hash: true }
    })

    if (!existingConfig) return null

    if (isReadOnly(docId)) {
      existingConfig = await prismaClient.explorer_config.findFirst({
        where: { id: docId },
        select: {
          native_contract: {
            select: {
              name: true,
              address: true
            }
          },
          net: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      existingConfig.net = existingConfig.net.pop()

      const nativeContracts = {}

      Object.values(existingConfig.native_contract).forEach(contract => {
        nativeContracts[contract.name] = contract.address
      })

      existingConfig.nativeContracts = nativeContracts
      delete existingConfig.native_contract
    }

    return existingConfig
  },
  async insertOne (data, collection) {
    const newConfig = rawConfigToEntity(data)
    const docId = newConfig.id

    // save config document
    await prismaClient.explorer_config.upsert({
      where: { id: docId },
      update: newConfig,
      create: newConfig
    })

    if (isReadOnly(docId)) {
      const newNet = rawNetToEntity(data.net)
      const nativeContracts = Object.entries(data.nativeContracts)

      newNet.configId = docId

      // save network
      await prismaClient.net.upsert({
        where: { id: docId },
        update: newNet,
        create: newNet
      })

      // save native contracts
      nativeContracts.forEach(async ([name, address]) => {
        const newNativeContract = rawNativeContractToEntity({
          name: name,
          address: address
        })

        newNativeContract.configId = docId

        await prismaClient.native_contract.upsert({
          where: { address: newNativeContract.address },
          update: newNativeContract,
          create: newNativeContract
        })
      })
    }

    return newConfig
  },
  async updateOne (filter, newData, options = {}, collection) {
    const newConfig = rawConfigUpdateToEntity(newData.$set)
    const docId = filter._id

    await prismaClient.explorer_config.update({
      where: { id: docId },
      data: newConfig
    })

    return newConfig
  }
}

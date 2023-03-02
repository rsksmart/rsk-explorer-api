import { rawConfigToEntity, rawConfigUpdateToEntity, rawNativeContractToEntity, rawNetToEntity } from '../converters/config.converters'
import { prismaClient } from '../lib/Setup'

export const configRepository = {
  async findOne (query = {}, project = {}, collection) {
    let existingConfig = await prismaClient.explorer_config.findFirst({
      where: { id: query._id },
      select: {
        hash: true
      }
    })

    if (!existingConfig) return null

    if (query._id === '_explorerInitialConfiguration') {
      existingConfig = await prismaClient.explorer_config.findFirst({
        where: { id: query._id },
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

      console.log({ pepe: JSON.stringify(existingConfig, null, 4) })

      const nativeContracts = {}

      Object.values(existingConfig.native_contract).forEach(contract => {
        nativeContracts[contract.name] = contract.address
      })

      console.log({ pepe: JSON.stringify(nativeContracts, null, 0) })

      existingConfig.nativeContracts = nativeContracts
      delete existingConfig.native_contract

      console.log({ pepe2: JSON.stringify(existingConfig, null, 4) })
    }

    return existingConfig
  },
  async insertOne (data, collection) {
    const newConfig = rawConfigToEntity(data)

    await prismaClient.explorer_config.upsert({
      where: { id: newConfig.id },
      update: newConfig,
      create: newConfig
    })

    if (data._id === '_explorerInitialConfiguration') {
      const newNet = rawNetToEntity(data.net)
      newNet.configId = newConfig.id

      await prismaClient.net.upsert({
        where: { id: newNet.id },
        update: newNet,
        create: newNet
      })

      const nativeContracts = Object.entries(data.nativeContracts)

      nativeContracts.forEach(async ([name, address]) => {
        const newNativeContract = rawNativeContractToEntity({
          name: name,
          address: address
        })

        newNativeContract.configId = newConfig.id

        await prismaClient.native_contract.upsert({
          where: { address: newNativeContract.address },
          update: newNativeContract,
          create: newNativeContract
        })
      })
    }

    await collection.insertOne(data)

    return newConfig
  },
  async updateOne (filter, newData, options = {}, collection) {
    const newConfig = rawConfigUpdateToEntity(newData.$set)

    await prismaClient.explorer_config.update({
      where: { id: filter._id },
      data: newConfig
    })

    await collection.updateOne(filter, newData, options)

    return newConfig
  }
}

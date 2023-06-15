import { rawConfigToEntity, rawConfigUpdateToEntity, rawNativeContractToEntity, rawNetToEntity } from '../converters/config.converters'
import { prismaClient } from '../lib/Setup'

const isReadOnly = id => id === '_explorerInitialConfiguration'

export const configRepository = {
  async findOne (query = {}) {
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
          native_contract: { select: { name: true, address: true } },
          net: { select: { id: true, name: true } }
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
  async insertOne (data) {
    const newConfig = rawConfigToEntity(data)
    const docId = newConfig.id
    const transactionQueries = [prismaClient.explorer_config.createMany({ data: [newConfig], skipDuplicates: true })]

    if (isReadOnly(docId)) {
      const newNet = rawNetToEntity({ ...data.net, configId: docId })
      const rawNativeContracts = Object.entries(data.nativeContracts)
      const nativeContractsToSave = rawNativeContracts.map(([name, address]) => rawNativeContractToEntity({ name, address, configId: docId }))

      transactionQueries.push(prismaClient.net.createMany({ data: [newNet], skipDuplicates: true }))
      transactionQueries.push(prismaClient.native_contract.createMany({ data: nativeContractsToSave, skipDuplicates: true }))
    }

    await prismaClient.$transaction(transactionQueries)

    return newConfig
  },
  async updateOne (filter, newData) {
    const newConfig = rawConfigUpdateToEntity(newData.$set)
    const docId = filter._id

    await prismaClient.explorer_config.update({
      where: { id: docId },
      data: newConfig
    })

    return newConfig
  }
}

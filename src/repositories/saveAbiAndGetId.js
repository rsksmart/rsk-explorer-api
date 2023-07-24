import { prismaClient } from '../lib/Setup'
import {
  rawAbiToEntity,
  rawAbiInputToEntity
} from '../converters/abi.converters'

export function saveAbiAndGetId (abi) {
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

  return { transactionQueries, abiId: abiToSave.id }
}

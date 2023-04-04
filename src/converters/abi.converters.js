import { removeNullFields } from '../repositories/utils'

function rawAbiToEntity (data) {
  return {
    anonymous: data.anonymous,
    name: data.name,
    type: data.type
  }
}

function rawInputToEntity (data) {
  return {
    name: data.name,
    type: data.type,
    indexed: data.indexed
  }
}

function rawAbiInputToEntity (data) {
  return {
    abiId: data.abiId,
    name: data.name,
    type: data.type
  }
}

function abiEntityToRaw ({
  anonymous,
  name,
  type,
  abi_input: inputs
}) {
  const abiToReturn = {
    anonymous,
    name,
    type,
    inputs: inputs.map(({input}) => input)
  }

  return removeNullFields(abiToReturn)
}

export {
  rawAbiToEntity,
  rawInputToEntity,
  rawAbiInputToEntity,
  abiEntityToRaw
}

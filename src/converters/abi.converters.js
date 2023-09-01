import { removeNullFields } from '../repositories/utils'

function rawAbiToEntity ({
  anonymous,
  name,
  type
}) {
  return {
    id: `${name}_${type}_${anonymous}`,
    anonymous,
    name,
    type
  }
}

function rawAbiInputToEntity ({
  abiId,
  name,
  type,
  indexed
}) {
  return {
    abiId,
    name,
    type,
    indexed
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
    type
  }

  if (inputs.length) {
    abiToReturn.inputs = inputs
  }

  return removeNullFields(abiToReturn)
}

export {
  rawAbiToEntity,
  rawAbiInputToEntity,
  abiEntityToRaw
}

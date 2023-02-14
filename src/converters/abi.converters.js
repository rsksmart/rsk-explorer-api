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

export {rawAbiToEntity, rawInputToEntity, rawAbiInputToEntity}

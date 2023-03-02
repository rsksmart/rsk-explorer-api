function rawConfigToEntity ({
  _id,
  hash,
  _created,
  _updated
}) {
  return {
    id: _id,
    hash: hash || null,
    created: _created,
    updated: _updated || null
  }
}

function rawNetToEntity ({
  id,
  name
}) {
  return {
    id,
    name
  }
}

function rawNativeContractToEntity ({
  name,
  address
}) {
  return {
    name,
    address
  }
}

export {
  rawConfigToEntity,
  rawNetToEntity,
  rawNativeContractToEntity
}

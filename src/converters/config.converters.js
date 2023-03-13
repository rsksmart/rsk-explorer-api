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

// "hash" and "_updated" are updated for all docs except "_explorerInitialConfiguration" (read only)
function rawConfigUpdateToEntity ({
  hash,
  _updated
}) {
  return {
    hash,
    updated: _updated
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

export { rawConfigToEntity, rawConfigUpdateToEntity, rawNetToEntity, rawNativeContractToEntity }

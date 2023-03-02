function rawBalancesLogToEntity ({
  _created,
  blockHash
}) {
  return {
    created: String(_created),
    blockHash: blockHash
  }
}

function entityToRawBalancesLog (data) {
  if (data) {
    data._created = Number(data.created)
    delete data.created
  }
  return data
}
export { rawBalancesLogToEntity, entityToRawBalancesLog }

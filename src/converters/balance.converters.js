function rawBalanceToEntity ({
  address,
  _created,
  timestamp,
  balance,
  blockHash,
  blockNumber
}) {
  return {
    address,
    created: String(_created),
    timestamp: String(timestamp),
    balance,
    blockHash,
    blockNumber
  }
}

function entityToRawBalance (data) {
  if (data) {
    data._created = Number(data.created)
    data.timestamp = Number(data.timestamp)
    delete data.created
  }
  return data
}
export { rawBalanceToEntity, entityToRawBalance }

import { removeNullFields } from '../repositories/utils'

function rawBalanceToEntity ({
  address,
  _created,
  timestamp,
  balance,
  blockHash,
  blockNumber
}) {
  if (balance === 0) {
    balance = '0'
  }
  return {
    address,
    created: String(_created),
    timestamp: String(timestamp),
    balance,
    blockHash,
    blockNumber
  }
}

function entityToRawBalance ({
  id: _id,
  address,
  balance,
  blockHash,
  blockNumber,
  timestamp,
  created: _created
}) {
  const balanceToReturn = {
    _id,
    address,
    balance,
    blockHash,
    blockNumber,
    timestamp: Number(timestamp),
    _created: Number(_created)
  }

  return removeNullFields(balanceToReturn)
}
export { rawBalanceToEntity, entityToRawBalance }

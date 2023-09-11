import { removeNullFields } from '../repositories/utils'

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

function entityToRawBalance ({
  address,
  balance,
  blockHash,
  blockNumber,
  timestamp,
  created: _created
}) {
  const balanceToReturn = {
    address,
    balance: balance === '0' ? 0 : balance,
    blockHash,
    blockNumber,
    timestamp: Number(timestamp),
    _created: Number(_created)
  }

  return removeNullFields(balanceToReturn)
}
export { rawBalanceToEntity, entityToRawBalance }

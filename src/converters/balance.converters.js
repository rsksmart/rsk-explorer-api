import { removeNullFields } from '../repositories/utils'

function rawBalanceToEntity ({
  address,
  _created: created,
  timestamp,
  balance,
  blockHash,
  blockNumber
}) {
  return {
    address,
    created,
    timestamp,
    balance,
    blockHash,
    blockNumber
  }
}

function entityToRawBalance ({
  id,
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

  if (id) balanceToReturn.id = id.toString()

  return removeNullFields(balanceToReturn)
}
export { rawBalanceToEntity, entityToRawBalance }

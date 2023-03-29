import { removeNullFields } from '../repositories/utils'

function rawTokenToEntity ({
  id,
  address,
  contract,
  balance,
  block
}) {
  return {
    id,
    address,
    contract,
    balance,
    blockNumber: block.number,
    blockHash: block.hash
  }
}

function tokenEntityToRaw ({
  id: _id,
  address,
  contract,
  balance,
  blockNumber,
  blockHash
}) {
  const tokenToReturn = {
    _id,
    address,
    contract,
    block: {blockNumber, blockHash},
    balance
  }

  return removeNullFields(tokenToReturn)
}
export {rawTokenToEntity, tokenEntityToRaw}

import { removeNullFields } from '../repositories/utils'

function rawTokenToEntity ({
  address,
  contract,
  balance,
  block
}) {
  return {
    address,
    contract,
    balance,
    blockNumber: block.number,
    blockHash: block.hash
  }
}

function tokenEntityToRaw ({
  address,
  contract,
  balance,
  blockNumber,
  blockHash
}) {
  const tokenToReturn = {
    address,
    contract,
    block: {number: blockNumber, hash: blockHash},
    balance
  }

  return removeNullFields(tokenToReturn)
}
export {rawTokenToEntity, tokenEntityToRaw}

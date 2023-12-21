import { addressEntityToRaw } from './address.converters'

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
  return {
    address,
    contract,
    block: { number: blockNumber, hash: blockHash },
    balance
  }
}

function tokensByAddressEntityToRaw (tokenEntity, addressEntity) {
  return {
    ...addressEntityToRaw(addressEntity),
    ...tokenEntityToRaw(tokenEntity)
  }
}

export {
  rawTokenToEntity,
  tokenEntityToRaw,
  tokensByAddressEntityToRaw
}

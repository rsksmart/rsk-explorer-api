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
export {rawTokenToEntity, tokenEntityToRaw}

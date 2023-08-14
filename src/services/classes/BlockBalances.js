export async function fetchAddressesBalancesFromNode (addresses, block, nod3) {
  const balances = []
  if (addresses && addresses.length && block && nod3) {
    const { hash: blockHash, number: blockNumber, timestamp } = block

    for (const {address} of new Set(addresses)) {
      const balance = await nod3.eth.getBalance(address, blockNumber)
      balances.push({
        address,
        balance: (parseInt(balance)) ? balance : 0,
        blockHash,
        blockNumber,
        timestamp,
        _created: Date.now()
      })
    }
  }

  return balances
}

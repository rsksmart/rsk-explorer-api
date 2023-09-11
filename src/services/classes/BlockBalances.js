export async function fetchAddressesBalancesFromNode (addresses, block, nod3) {
  const balances = []
  const latestBalances = { balances: [] }
  const parseBalance = (balance) => (parseInt(balance)) ? balance : '0'
  if (addresses && addresses.length && block && nod3) {
    const { hash: blockHash, number: blockNumber, timestamp } = block
    latestBalances.blockNumber = blockNumber

    for (const {address} of new Set(addresses)) {
      const balance = await nod3.eth.getBalance(address, blockNumber)
      balances.push({
        address,
        balance: parseBalance(balance),
        blockHash,
        blockNumber,
        timestamp,
        _created: Date.now()
      })

      const latestBalance = await nod3.eth.getBalance(address, 'latest')
      latestBalances.balances.push({
        address,
        blockNumber,
        balance: parseBalance(latestBalance)
      })
    }
  }

  return { balances, latestBalances }
}

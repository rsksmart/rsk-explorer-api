const endpoints = {
  getPendingTransaction: ({ hash }) => `api?module=txPending&action=getPendingTransaction&hash=${hash}`,
  getPendingTransactionsByAddress: ({ address }) => `getPendingTransactionsByAddress&address=${address}`
}

const fixtures = {
  // the db still needs to be populated with txPending data
  testnet: {
    txHashesForGetPendingTransactionEndpoint: [],
    addressesForGetPendingTransactionsByAddress: []
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

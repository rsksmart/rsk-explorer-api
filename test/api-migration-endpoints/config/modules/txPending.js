const endpoints = {
  getPendingTransaction: ({ hash }) => `/api?module=txPending&action=getPendingTransaction&hash=${hash}`,
  getPendingTransactionsByAddress: ({ address }) => `/api?module=txPending&action=getPendingTransactionsByAddress&address=${address}`
}

// Replace with current pending transactions stored in database
const pendingTx1 = {
  hash: '0x069ed178faa3c23090454e04c7e966c326a58c45e7ad3eae91cb365bcba1451f',
  from: '0xc67d9ee30d2119a384e02de568be80fe785074ba',
  to: '0x462d7082f3671a3be160638be3f8c23ca354f48a'
}

const pendingTx2 = {
  hash: '0x68aa9fb4db62799d5280e64cd3d476d7e23cfc8408c5085109865afc8b6f9e95',
  from: '0xf4695cff1e7dd0201b71a8a4f01d0450f89cc46c',
  to: '0x00'
}

const fixtures = {
  testnet: {
    txHashesForGetPendingTransactionEndpoint: [
      pendingTx1.hash,
      pendingTx2.hash
    ],
    addressesForGetPendingTransactionsByAddressEndpoint: [
      pendingTx1.from,
      pendingTx1.to,
      pendingTx2.from,
      pendingTx2.to
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

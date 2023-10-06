const endpoints = {
  getPendingTransaction: ({ hash }) => `/api?module=txPending&action=getPendingTransaction&hash=${hash}`,
  getPendingTransactionsByAddress: ({ address }) => `/api?module=txPending&action=getPendingTransactionsByAddress&address=${address}`
}

// Replace with current pending transactions stored in database
const pendingTx1 = {
  hash: '0xc09f07204a7cf802905b06d0655d9a05cd65f4691272e9dcc8629987fbbf2ddd',
  from: '0xc67d9ee30d2119a384e02de568be80fe785074ba',
  to: '0x7e2f245f7dc8e78576ecb13aefc0a101e9be1ad3'
}

const pendingTx2 = {
  hash: '0xb481c5eff1755ea2db7bd0fccc5db5ffd7e95f713f8a5a7ad64ea2bdf97b2740',
  from: '0xf813c5dfe9602fb4b76ad71305788e9ca1649f31',
  to: '0x39192498fcf1dbe11653040bb49308e09a1056ac'
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

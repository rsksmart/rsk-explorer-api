const endpoints = {
  getPendingTransaction: ({ hash }) => `/api?module=txPending&action=getPendingTransaction&hash=${hash}`,
  getPendingTransactionsByAddress: ({ address }) => `/api?module=txPending&action=getPendingTransactionsByAddress&address=${address}`
}

const pendingTx1 = {
  hash: '0x3d99fc07dabb8d3b9915ab927d011e5059c3376bf741ed1a3800b78757d7f23e',
  from: '0xc67d9ee30d2119a384e02de568be80fe785074ba',
  to: '0x462d7082f3671a3be160638be3f8c23ca354f48a'
}

const pendingTx2 = {
  hash: '0x517814fda7c2432beca1e530fa50213c362b0af1d90418e46a5fa129b19229f4',
  from: '0x7c1dc6845f1f5bbe8aeee35e10af48abe47cccc7',
  to: '0x953cd84bb669b42fbec83ad3227907023b5fc4ff'
}

const fixtures = {
  // the db still needs to be populated with txPending data
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

const endpoints = {
  getInternalTransaction: ({ internalTxId }) => `/api?module=internalTransactions&action=getInternalTransaction&internalTxId=${internalTxId}`,
  getInternalTransactions: () => '/api?module=internalTransactions&action=getInternalTransactions',
  getInternalTransactionsByAddress: ({ address }) => `/api?module=internalTransactions&action=getInternalTransactionsByAddress&address=${address}`,
  getInternalTransactionsByBlock: ({ hashOrNumber, number }) => {
    return `/api?module=internalTransactions&action=getInternalTransactionsByBlock${hashOrNumber ? `&hashOrNumber=${hashOrNumber}` : `&number=${number}`}`
  },
  getInternalTransactionsByTxHash: ({ transactionHash, hash }) => {
    return `/api?module=internalTransactions&action=getInternalTransactionsByTxHash${transactionHash ? `&transactionHash=${transactionHash}` : `&hash=${hash}`}`
  }
}

const fixtures = {
  testnet: {
    internalTxIdsForGetInternalTransactionEndpoint: [
      '03fbdc500100129ca6a8e6f2a4691bbc',
      '03fbdc50000077657f5fd7b366b153a3',
      '03e8fb4002001118083522f87e673122'
    ],
    addressesForGetInternalTransactionsByAddressEndpoint: [
      '0x6aff5f3d80744d84a4e4033b27de2ac1d6a49f34',
      '0xf078375a3dd89ddf4d9da460352199c6769b5f10',
      '0x493eefbb8f0a22f85708c0c890e7b531e61a7018'
    ],
    blockHashesForGetInternalTransactionsByBlockEndpoint: [
      '0x4ccecca00473df28e4689fa7d4f3de720c887ae5359167e46d07c430e8892a7d',
      '0xfb2103e8d11fed5c15133e05f5f833f3dd81523b3ad86754c8ad47f3d2b527d6',
      '0xeb480b001af5a94584e007cb2186a224323c6749f6c093afebbcee91fe58622a'
    ],
    blockNumbersForGetInternalTransactionsByBlockEndpoint: [
      4177349,
      4100020,
      4100019
    ],
    txHashesForGetInternalTransactionsByTxHashEndpoint: [
      '0x33cb64450e2c5c27b3156650e03bddb446dcfb661d85fc69903eabf8f9ade20f',
      '0x2459cec68e7e0e2dd84fc1bb8f0b01abb3316eabe74f07657f5fd7b366b153a3',
      '0x532252e56396effb714e20c4ab55106eb06021aad131e118083522f87e673122'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

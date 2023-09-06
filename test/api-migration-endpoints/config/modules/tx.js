const endpoints = {
  getTransactions: ({ query } = {}) => `/api?module=transactions&action=getTransactions${query ? `&${query}` : ''}`,
  getTransaction: ({ hash }) => `/api?module=transactions&action=getTransaction&hash=${hash}`,
  getTransactionWithAddressData: ({ hash }) => `/api?module=transactions&action=getTransactionWithAddressData&hash=${hash}`,
  getTransactionsByBlock: ({ hashOrNumber, number }) => {
    return `/api?module=transactions&action=getTransactionsByBlock${hashOrNumber ? `&hashOrNumber=${hashOrNumber}` : `&number=${number}`}`
  },
  getTransactionsByAddress: ({ address }) => `/api?module=transactions&action=getTransactionsByAddress&address=${address}`
}

const fixtures = {
  testnet: {
    queriesForGetTransactionsEndpoint: [
      'query[txType][]=bridge&query[txType][]=remasc',
      'query[txType][]=bridge',
      'query[txType][]=remasc'
    ],
    transactionHashesForGetTransactionEndpoint: [
      '0xf52b8a41097d1e6d41d437ee49179a256b2f862a432281fcccd159a7f7d1405b',
      '0x2b1ab636bfff4f2f060453d366905c127d8a0a3dd6e2e1cae1e49a18d2808863',
      '0x8d9a3b9931fd5ca5ca0449bc7efb80b785901ca4b2c0ee18fccec0b3472c1854'
    ],
    transactionHashesForGetTransactionWithAddressDataEndpoint: [
      '0x1cf5d0e3a32b86011a7a013767ab60e33761106f0d994c8915997f544853bfc0',
      '0x227c31fba5b2786debbfbe0814c5bab383a93b63550da6863867cc112633b557',
      '0xca550f5c076da2baca9b41aeed7b9e1a917e7a4c8bd1138dfcef7cf7f4807a23'
    ],
    blockHashesForGetTransactionsByBlockEndpoint: [
      '0x5e46a035d4e9b4cff611e4d57802074cb32661ab2d19d4cda5aa63a30b8de380',
      '0x94b31a51ec88dec772274a8681af3b1d823871edb64232a2e3270e82924c6e81',
      '0xa1b6acbfc40b121a74007202abe6c420e365c339b1aba5dd5599431aac280089'
    ],
    blockNumbersForGetTransactionsByBlockEndpoint: [
      4092582,
      3000020,
      4092555
    ],
    addressesForGetTransactionsByAddressEndpoint: [
      '0x94e907f6b903a393e14fe549113137ca6483b5ef',
      '0xc1aeaafa4a9bf0a74464d496d220bf89ce9bf901',
      '0x6aff5f3d80744d84a4e4033b27de2ac1d6a49f34'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

const endpoints = {
  getBalance: ({ block, address }) => `/api?module=balances&action=getBalance&block=${block}&address=${address}`,
  getBalances: ({ address }) => `/api?module=balances&action=getBalances&address=${address}`,
  getStatus: () => '/api?module=balances&action=getStatus'
}

const fixtures = {
  testnet: {
    blockNumbersAndAddressesForGetBalanceEndpoint: [
      { address: '0x6ef810908a2a75577926133799d19b7d37bedd81', block: 4100019 },
      { address: '0x479a664a4bf82dfd4cd04a9c6a4dc41fc5666a28', block: 4100020 },
      { address: '0xa94e301a7aa62ce1b37a2aa2370f1f4746a22316', block: 4100020 }
    ],
    addressesForGetBalancesEndpoint: [
      '0x6ef810908a2a75577926133799d19b7d37bedd81',
      '0x479a664a4bf82dfd4cd04a9c6a4dc41fc5666a28',
      '0xa94e301a7aa62ce1b37a2aa2370f1f4746a22316'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

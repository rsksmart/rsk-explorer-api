const endpoints = {
  getAddress: ({ address }) => `/api?module=addresses&action=getAddress&address=${address}`,
  getAddresses: () => `/api?module=addresses&action=getAddresses`,
  getMiners: ({ fromBlock } = {}) => `/api?module=addresses&action=getMiners${fromBlock ? `&fromBlock=${fromBlock}` : ''}`,
  getTokens: () => `/api?module=addresses&action=getTokens`,
  getCirculatingSupply: () => '/api?module=addresses&action=getCirculatingSupply',
  getCode: ({ address }) => `/api?module=addresses&action=getCode&address=${address}`,
  findAddresses: ({ name }) => `/api?module=addresses&action=findAddresses&name=${name}`
}

const fixtures = {
  testnet: {
    addressesForGetAddressEndpoint: [
      '0x39192498fcf1dbe11653040bb49308e09a1056ac',
      '0x493eefbb8f0a22f85708c0c890e7b531e61a7018',
      '0xf078375a3dd89ddf4d9da460352199c6769b5f10',
      '0xd45b351a3929782747154edb160f8e14769c153b'
    ],
    blockNumbersForGetMinersEndpoint: [
      4177349,
      4100013,
      3000013
    ],
    addressesForGetCodeEndpoint: [
      '0x493eefbb8f0a22f85708c0c890e7b531e61a7018',
      '0xf078375a3dd89ddf4d9da460352199c6769b5f10',
      '0x222efdf7d53f3c881f21da31fc7af7cc0133f4cf'
    ],
    namesForFindAddressesEndpoint: [
      'Dollar Token',
      'bridge',
      'remasc'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

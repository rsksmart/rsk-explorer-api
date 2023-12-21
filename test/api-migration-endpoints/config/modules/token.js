const endpoints = {
  getTokenAccounts: ({ contract, address }) => {
    return `/api?module=tokens&action=getTokenAccounts${contract ? `&contract=${contract}` : `&address=${address}`}`
  },
  getTokensByAddress: ({ address }) => {
    return `/api?module=tokens&action=getTokensByAddress&address=${address}`
  },
  getContractAccount: ({ contract, address }) => `/api?module=tokens&action=getContractAccount&contract=${contract}&address=${address}`,
  getTokenAccount: ({ contract, address }) => `/api?module=tokens&action=getTokenAccount&contract=${contract}&address=${address}`,
  getTokenBalance: ({ contract, addresses }) => `/api?module=tokens&action=getTokenBalance&contract=${contract}${addresses ? `&addresses=${addresses}` : ''}`
}

const fixtures = {
  testnet: {
    contractAddressesForGetTokenAccountsEndpoint: [
      '0xef318ce0c5fb611cedb6f6184a0a37d2f44c38d5',
      '0x128302d4250bf9846ef48635100cdaee0366b859',
      '0xdbdc2d486c10c23902a46a17bec1f7de64075257'
    ],
    addressesForGetTokensByAddressEndpoint: [
      '0x0f22aa31809d0cf13cc234d99a12be9f0d6485ed',
      '0xd596917cb886ae44014a3b2adcf6d8634e04d3b6',
      '0x94e907f6b903a393e14fe549113137ca6483b5ef'
    ],
    contractsAndAddressesForGetContractAccountEndpoint: [
      { contract: '0x128302d4250bf9846ef48635100cdaee0366b859', address: '0xf1fe7f7fdf50adb64cac253c05f1331255fefec7' },
      { contract: '0x128302d4250bf9846ef48635100cdaee0366b859', address: '0xd596917cb886ae44014a3b2adcf6d8634e04d3b6' },
      { contract: '0xef318ce0c5fb611cedb6f6184a0a37d2f44c38d5', address: '0x222efdf7d53f3c881f21da31fc7af7cc0133f4cf' }
    ],
    contractsAndAddressesForGetTokenAccountEndpoint: [
      { contract: '0x128302d4250bf9846ef48635100cdaee0366b859', address: '0xf1fe7f7fdf50adb64cac253c05f1331255fefec7' },
      { contract: '0x128302d4250bf9846ef48635100cdaee0366b859', address: '0xd596917cb886ae44014a3b2adcf6d8634e04d3b6' },
      { contract: '0xef318ce0c5fb611cedb6f6184a0a37d2f44c38d5', address: '0x222efdf7d53f3c881f21da31fc7af7cc0133f4cf' }
    ],
    contractAddressesForGetTokenBalanceEndpoint: [
      '0xef318ce0c5fb611cedb6f6184a0a37d2f44c38d5',
      '0x007b3aa69a846cb1f76b60b3088230a52d2a83ac',
      '0x128302d4250bf9846ef48635100cdaee0366b859'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

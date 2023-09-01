const endpoints = {
  getSummary: ({ hash }) => `/api?module=summary&action=getSummary&hash=${hash}`,
  getSummaries: () => '/api?module=summary&action=getSummaries'
}

const fixtures = {
  testnet: {
    blockHashesForGetSummaryEndpoint: [
      '0xafe0a6a3710d9c80d2873f3bfe8be06dee85ac467baf5a9fcc8954dccb39029d',
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

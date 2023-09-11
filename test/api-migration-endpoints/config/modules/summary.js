const endpoints = {
  getSummary: ({ hash }) => `/api?module=summary&action=getSummary&hash=${hash}`,
  getSummaries: () => '/api?module=summary&action=getSummaries'
}

const fixtures = {
  testnet: {
    blockHashesForGetSummaryEndpoint: [
      '0x3018a56eb41bd1e0aa0b037cec82abebd36d8373629d31253f45a04b2695ffc5',
      '0xb33e25877e1f8bf7b427905b2e829b5be5946fdeaafc2ea580b488ccf059e6a4',
      '0x80c5ec2d8b86b0da7760a8564a9a6c76b97002989b33bcc428aa46b3abd151a0'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

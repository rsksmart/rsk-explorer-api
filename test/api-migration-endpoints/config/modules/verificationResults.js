const endpoints = {
  getResults: () => '/api?module=verificationResults&action=getResults',
  getVerification: ({ address, fields }) => {
    return `/api?module=verificationResults&action=getVerification&address=${address}${fields ? `&fields=${fields}` : ''}`
  }
}

const fixtures = {
  testnet: {
    addressesForGetVerificationEndpoint: [
      // Requisites:
      // Store blocks 4314259, 4314394
      // Verify contracts
      '0xc8069f0ecaad27b408bc59632644eba6aa249dc6',
      '0xfc0be0c9e865424edebdfc88bfe1b788e5f755ec'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

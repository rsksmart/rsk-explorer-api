const endpoints = {
  getVerifiedContracts: () => '/api?module=contractVerifier&action=getVerifiedContracts',
  verify: () => `/api?module=contractVerifier&action=verify`,
  getSolcVersions: () => '/api?module=contractVerifier&action=getSolcVersions',
  getEvmVersions: () => '/api?module=contractVerifier&action=getEvmVersions',
  getVerificationResult: ({ id }) => `/api?module=contractVerifier&action=getVerificationResult&id=${id}`,
  isVerified: ({ address, fields }) => `/api?module=contractVerifier&action=isVerified&address=${address}${fields ? `&${fields}` : ''}`
}

const fixtures = {
  testnet: {
    addressesForIsVerifiedEndpoint: [
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

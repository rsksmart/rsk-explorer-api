const endpoints = {
  getVerifiedContracts: () => '/api?module=contractVerifier&action=getVerifiedContracts',
  verify: () => `/api?module=contractVerifier&action=verify`, // TODO: do something
  getSolcVersions: () => '/api?module=contractVerifier&action=getSolcVersions',
  getEvmVersions: () => '/api?module=contractVerifier&action=getEvmVersions',
  getVerificationResult: ({ id }) => `/api?module=contractVerifier&action=getVerificationResult&id=${id}`,
  getVerification: ({ address, fields }) => {
    return `/api?module=contractVerifier&action=isVerified&address=${address}${fields ? `&fields=${fields}` : ''}`
  }
}

const fixtures = {
  // the db still needs to be populated with contractVerification data
  testnet: {},
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

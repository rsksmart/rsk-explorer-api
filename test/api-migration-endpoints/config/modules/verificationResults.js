const enpdoints = {
  getResults: () => '/api?module=verificationResults&action=getResults',
  getVerification: ({ address, fields }) => {
    return `/api?module=verificationResults&action=getVerification&address=${address}${fields ? `&fields=${fields}` : ''}`
  }
}

const fixtures = {
  // the db still needs to have verified results inserted
  testnet: {},
  mainnet: {}
}

export {
  enpdoints,
  fixtures
}

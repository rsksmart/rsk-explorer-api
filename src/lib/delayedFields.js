export default {
  /*   Address: {
      getAddress: {
        fields: ['balance', 'txBalance'],
        action: 'updateAddress',
        runIfEmpty: true
      }
    }, */
  ContractVerification: {
    getVersions: {
      action: 'getVersions',
      registry: true,
      runIfEmpty: true
    },
    verify: {
      action: 'requestVerification',
      registry: true,
      runIfEmpty: true
    }
  }
}

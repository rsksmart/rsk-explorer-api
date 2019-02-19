export default {
  Address: {
    getAddress: {
      fields: ['balance', 'txBalance'],
      action: 'updateAddress',
      runIfEmpty: true
    }
  }
}

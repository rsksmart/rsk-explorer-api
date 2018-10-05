export default {
  Address: {
    getAddress: {
      fields: ['balance'],
      action: 'updateAddress',
      runIfEmpty: true
    }
  }
}

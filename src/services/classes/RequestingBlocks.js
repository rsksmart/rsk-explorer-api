export const RequestingBlocks = {
  requesting: {},
  add (key, data) {
    data = data || true
    if (!isNaN(parseInt(key))) {
      this.requesting[key] = data
    }
  },
  delete (key) {
    this.requesting[key] = null
    delete (this.requesting[key])
  },
  isRequested (key) {
    return this.requesting[key]
  },
  total () {
    return Object.keys(this.requesting).length
  }
}

export const RequestingBlocks = {
  requesting: {},
  add (number, data) {
    data = data || true
    if (Number.isInteger(number)) {
      this.requesting[number] = data
    }
  },
  delete (number) {
    this.requesting[number] = null
    delete (this.requesting[number])
  },
  isRequested (number) {
    return this.requesting[number]
  },
  total () {
    return Object.keys(this.requesting).length
  }
}

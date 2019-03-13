export class RequestCache {
  constructor () {
    this.requested = {}
    this.block = null
  }
  set (block, keys, value) {
    this.setBlock(block)
    this.requested[this.makeKey(keys)] = value
  }
  isRequested (block, keys) {
    this.setBlock(block)
    return this.requested[this.makeKey(keys)]
  }
  setBlock (block) {
    if (block !== this.block) {
      this.block = block
      this.requested = {}
    }
  }
  makeKey (args) {
    return args.join('-')
  }
}

export default RequestCache

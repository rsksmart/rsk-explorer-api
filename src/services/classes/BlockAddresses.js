import { Addresses } from './Addresses'
import { isBlockObject } from '../../lib/utils'

export class BlockAddresses extends Addresses {
  constructor (blockData, { nod3, initConfig, replace }) {
    if (!isBlockObject(blockData)) throw new Error('Invalid blockData')
    super({ nod3, initConfig, replace })
    this.block = blockData
  }
  add (address, options) {
    options = options || {}
    options.block = this.block
    return super.add(address, options)
  }
}

export default Addresses

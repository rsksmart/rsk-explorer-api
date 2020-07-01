import { BcThing } from './BcThing'
import { Address } from './Address'
import { isBlockHash, isValidBlockNumber } from '../../lib/utils'

export class BlockBalances extends BcThing {
  constructor ({ block, addresses }, { nod3, collections, log, initConfig }) {
    let { number, hash } = block
    if (!Array.isArray(addresses)) throw new Error('addresses must be an array')
    if (!isBlockHash(hash)) throw new Error(`Invalid blockHash: ${hash}`)
    if (!isValidBlockNumber(number)) throw new Error(`Invalid block number: ${number}`)
    super({ nod3, collections, initConfig, log })
    this.blockHash = hash
    this.blockNumber = number
    addresses = [...new Set(addresses.map(({ address }) => address))]
    this.addresses = addresses.map(address => new Address(address, { nod3, initConfig, collections, block: number }))
    this.balances = undefined
    this.collection = this.collections.Balances
  }
  async fetch () {
    try {
      if (this.balances) return this.balances
      let { addresses, blockHash, blockNumber } = this
      let balances = await Promise.all(addresses.map(async Addr => {
        let { address } = Addr
        let balance = await Addr.getBalance(blockNumber)
        let timestamp = Date.now()
        return { address, balance, blockHash, blockNumber, timestamp }
      }))
      this.balances = balances
      return this.balances
    } catch (err) {
      return Promise.reject(err)
    }
  }
  deleteOldBalances () {
    const { blockHash, blockNumber, collection } = this
    return Promise.all([collection.deleteMany({ blockHash }), collection.deleteMany({ blockNumber })])
  }
  async save () {
    try {
      let balances = await this.fetch()
      if (!balances.length) {
        let { blockHash, blockNumber } = this
        this.log.warn(`No balances for ${blockHash} /  ${blockNumber}`)
        return
      }
      await this.deleteOldBalances()
      let result = await this.collection.insertMany(balances)
      return result
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export default BlockBalances

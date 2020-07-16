import { BcThing } from './BcThing'
import { Address } from './Address'
import { isBlockHash, isValidBlockNumber } from '../../lib/utils'

export class BlockBalances extends BcThing {
  constructor ({ block, addresses }, { nod3, collections, log, initConfig }) {
    let { number, hash, timestamp } = block
    if (!Array.isArray(addresses)) throw new Error('addresses must be an array')
    if (!isBlockHash(hash)) throw new Error(`Invalid blockHash: ${hash}`)
    if (!isValidBlockNumber(number)) throw new Error(`Invalid block number: ${number}`)
    if (!timestamp) throw new Error('invalid block timestamp')
    super({ nod3, collections, initConfig, log })
    this.blockHash = hash
    this.blockNumber = number
    this.timestamp = timestamp
    addresses = [...new Set(addresses)]
    this.addresses = addresses.map(address => new Address(address, { nod3, initConfig, collections, block: number }))
    this.balances = undefined
    this.collection = this.collections.Balances
  }
  async fetch () {
    try {
      if (this.balances) return this.balances
      let { addresses, blockHash, blockNumber, timestamp } = this
      const balances = []
      for (let Addr of addresses) {
        let { address } = Addr
        let balance = await Addr.getBalance(blockNumber)
        balance = (parseInt(balance)) ? balance : 0
        let _created = Date.now()
        balances.push({ address, balance, blockHash, blockNumber, timestamp, _created })
      }
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

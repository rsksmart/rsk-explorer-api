import { BcThing } from './BcThing'
import { isBlockObject, isNullData } from '../../lib/utils'
import { fields, addrTypes } from '../../lib/types'

function createAddressData ({ address, isNative, name }) {
  const type = (isNative) ? addrTypes.CONTRACT : addrTypes.ADDRESS

  const dataHandler = {
    set: function (data, prop, val) {
      let protectedProperties = ['address', 'type', 'isNative']
      if (protectedProperties.includes(prop)) return
      switch (prop) {
        case 'code':
          val = val || null
          if (!isNullData(val)) {
            data.type = addrTypes.CONTRACT
            data.code = val
          }
          break

        case fields.LAST_BLOCK_MINED:
          const lastBlock = data[fields.LAST_BLOCK_MINED] || {}
          let number = lastBlock.number || -1
          if (val && val.miner === data.address && val.number > number) {
            data[prop] = Object.assign({}, val)
          }
          break

        default:
          data[prop] = val
          break
      }
      return true
    }
  }
  return new Proxy({ address, type, name, isNative }, dataHandler)
}

export class Address extends BcThing {
  constructor (address, { dbData, nod3, initConfig, block = 'latest' } = {}) {
    super({ nod3, initConfig })
    if (!this.isAddress(address)) throw new Error((`Invalid address: ${address}`))
    this.address = address
    this.fetched = false
    this.data = createAddressData(this)
    this.dbData = dbData
    this.contract = undefined
    this.block = 'latest'
    let { nativeContracts } = this
    this.isNative = (nativeContracts) ? nativeContracts.getNativeContractName(address) : false
    this.name = this.isNative || null
    this.setBlock(block)
  }

  setBlock (block) {
    if (!block) block = 'latest'
    if (isBlockObject(block)) {
      this.block = block.number
      this.setLastBlock(block)
    }
  }

  setLastBlock (block) {
    this.data[fields.LAST_BLOCK_MINED] = block
  }

  async getBalance (blockNumber = 'latest') {
    try {
      let { nod3, address } = this
      // rskj 1.0.1 returns 500 with blockNumbers
      let balance = await nod3.eth.getBalance(address, blockNumber)
      return balance
    } catch (err) {
      this.log.debug(err)
      return Promise.reject(new Error(`Address: error getting balance of ${this.address} ${err}`))
    }
  }

  getCode () {
    return this.nod3.eth.getCode(this.address, this.block)
  }

  async fetch (forceFetch) {
    try {
      if (this.fetched && !forceFetch) return this.getData()
      this.fetched = false
      let balance = await this.getBalance('latest')
      let { block } = this
      balance = balance || 0
      this.data.balance = balance
      if (block !== 'latest') this.data.blockBalance = await this.getBalance(block)
      let code = null
      let { dbData } = this
      if (dbData) {
        if (dbData.code) {
          code = dbData.code
          this.codeIsSaved = true
        }
        // Update lastBlockMined to highest block number
        this.data[fields.LAST_BLOCK_MINED] = dbData[fields.LAST_BLOCK_MINED]
      }

      if (undefined === code || code === null) {
        code = await this.getCode()
      }
      this.data.code = code
      this.fetched = true
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getData (serialize) {
    let data = Object.assign(this.data)
    // if (this.codeIsSaved) delete data.code
    return (serialize) ? this.serialize(data) : data
  }
  async save () {
    try {
      const data = this.getData(true)
      let res = await this.update(data)
      return res
    } catch (err) {
      return Promise.reject(err)
    }
  }

  isContract () {
    let data = this.getData()
    return data.type === addrTypes.CONTRACT
  }
}

export default Address

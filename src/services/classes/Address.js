import { BcThing } from './BcThing'
import { GetTxBalance } from './GetTxBalance'
import { isBlockObject, isNullData } from '../../lib/utils'
import { fields, addrTypes } from '../../lib/types'

export class Address extends BcThing {
  constructor (address, { nod3, initConfig, db, collections, block = 'latest' } = {}) {
    super({ nod3, initConfig, collections })
    if (!this.isAddress(address)) throw new Error((`Invalid address: ${address}`))
    this.address = address
    this.db = db || this.collections.Addrs
    this.codeIsSaved = false
    this.TxsBalance = new GetTxBalance(this.collections.Txs)
    this.data = new Proxy(
      { address, type: addrTypes.ADDRESS },
      {
        set (obj, prop, val) {
          if (prop === 'code') {
            val = val || null
            if (!isNullData(val)) {
              obj.type = addrTypes.CONTRACT
              obj.code = val
            }
          } else if (val && prop === fields.LAST_BLOCK_MINED) {
            const lastBlock = obj[fields.LAST_BLOCK_MINED] || {}
            let number = lastBlock.number || -1
            if (val.miner === obj.address && val.number > number) {
              obj[prop] = Object.assign({}, val)
            }
          } else {
            obj[prop] = val
          }
          return true
        }
      })
    this.block = 'latest'
    this.dbData = null
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
    this.setData(fields.LAST_BLOCK_MINED, block)
  }

  setData (prop, value) {
    if (prop === 'address') return
    this.data[prop] = value
  }

  getBalance () {
    return this.nod3.eth.getBalance(this.address, 'latest') // rskj 1.0.1 returns 500 with blockNumbers
  }

  getCode () {
    return this.nod3.eth.getCode(this.address, this.block)
  }

  async fetch () {
    try {
      let balance = await this.getBalance()
        .catch(err => {
          throw new Error(`Address: error getting balance of ${this.address} ${err}`)
        })
      balance = balance || 0
      this.data.balance = balance

      let code = null
      let dbData = await this.getFromDb()
      this.dbData = dbData

      if (dbData) {
        if (dbData.code) {
          code = dbData.code
          this.codeIsSaved = true
        }
        // Update lastBlockMined to highest block number
        this.setData(fields.LAST_BLOCK_MINED, dbData[fields.LAST_BLOCK_MINED])
      }

      if (undefined === code || code === null) {
        code = await this.getCode()
      }
      this.data.code = code
      const { nativeContracts } = this
      if (nativeContracts) {
        const isNative = this.nativeContracts.isNativeContract(this.address)
        if (isNative) {
          this.data.isNative = true
          this.data.name = this.nativeContracts.getNativeContractName(this.address)
          this.data.type = addrTypes.CONTRACT
        }
      }
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getFromDb () {
    return this.db.findOne({ address: this.address })
  }
  getData (serialize) {
    let data = Object.assign(this.data)
    if (this.codeIsSaved) delete data.code
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
  async updateTxBalance () {
    try {
      let txBalance = await this.getBalanceFromTxs()
      if (txBalance) this.setData('txBalance', txBalance)
      return txBalance
    } catch (err) {
      return Promise.reject(err)
    }
  }
  resetTxBalance () {
    this.setData('txBalance', '0x00')
  }
  update (data) {
    let address = data.address || this.address
    return this.db.updateOne({ address }, { $set: data }, { upsert: true })
  }

  async getBalanceFromTxs () {
    let address = this.address
    try {
      let balance = await this.TxsBalance.getBalanceFromTx(address)
      if (balance) return this.serialize(balance)
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

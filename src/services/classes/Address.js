import { BcThing } from './BcThing'
import { isBlockObject, isNullData, isAddress, isValidBlockNumber } from '../../lib/utils'
import { fields, addrTypes } from '../../lib/types'
import Contract from './Contract'
import { BcSearch } from 'rsk-contract-parser'
import { createTxObject } from './Tx'
import { InternalTx } from './InternalTx'
import { isZeroAddress } from '@rsksmart/rsk-utils'

export class Address extends BcThing {
  constructor (address, { nod3, initConfig, collections, tx, block, log } = {}) {
    super({ nod3, initConfig, collections, log })
    if (!this.isAddress(address)) throw new Error((`Invalid address: ${address}`))
    this.isZeroAddress = isZeroAddress(address)
    this.bcSearch = BcSearch(nod3)
    this.address = address
    this.fetched = false
    this.collection = (collections) ? collections.Addrs : undefined
    this.contract = undefined
    this.block = undefined
    this.blockNumber = undefined
    let { nativeContracts } = this
    let nName = (nativeContracts) ? nativeContracts.getNativeContractName(address) : undefined
    this.name = nName
    this.isNative = !!nName
    this.dbData = undefined
    this.tx = tx
    this.data = createAddressData(this)
    this.setBlock(block)
  }

  setBlock (block) {
    if (!isBlockObject(block) && !isValidBlockNumber(block)) {
      throw new Error(`Invalid block ${block}`)
    }
    if (isBlockObject(block)) {
      this.blockNumber = block.number
      this.block = block
      this.data[fields.LAST_BLOCK_MINED] = block
    } else {
      this.blockNumber = block
    }
  }

  async getBalance (blockNumber = 'latest') {
    try {
      if (this.isZeroAddress) return '0x0'
      let { nod3, address } = this
      let balance = await nod3.eth.getBalance(address, blockNumber)
      return balance
    } catch (err) {
      this.log.debug(err)
      return Promise.reject(new Error(`Address: error getting balance of ${this.address} ${err}`))
    }
  }

  async getCode () {
    try {
      if (this.isZeroAddress || this.isNative) return null
      let { code } = this.getData()
      let { nod3, address, blockNumber } = this
      if (code !== undefined) return code
      code = await nod3.eth.getCode(address, blockNumber)
      code = (isNullData(code)) ? null : code
      this.setData({ code })
      return code
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async fetch (forceFetch) {
    try {
      if (this.fetched && !forceFetch) return this.getData(true)
      this.fetched = false
      let dbData = (this.isZeroAddress) ? {} : await this.getFromDb()
      this.setData(dbData)

      let { blockNumber } = this

      let storedBlock = this.data.blockNumber || 0
      if (blockNumber >= storedBlock) {
        let balance = await this.getBalance('latest')
        this.setData({ balance, blockNumber })
      }

      let code = await this.getCode()
      // TODO suicide
      if (code) {
        // get contract info
        let deployedCode = (dbData) ? dbData[fields.DEPLOYED_CODE] : undefined
        if (!deployedCode) {
          let deployData = await this.getDeploymentData()

          if (!deployData) throw new Error('Deployment data is missing')
          deployedCode = deployData.deployedCode
          let createdByTx = deployData.tx
          // this.tx = createdByTx
          let data = {}
          data[fields.CREATED_BY_TX] = createdByTx
          data[fields.DEPLOYED_CODE] = deployedCode
          this.setData(data)
        }
        this.makeContract(deployedCode, dbData)
        let contractData = await this.contract.fetch()
        this.setData(contractData)
      }
      if (this.isNative) this.makeContract()
      this.fetched = true
      return this.getData(true)
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async getDeploymentData () {
    try {
      let { address, tx } = this
      let deployedCode = getDeployedCode(tx, address)
      if (!deployedCode) {
        ({ tx, deployedCode } = await this.searchDeploymentData())
      }
      if (tx && deployedCode) return { tx, deployedCode }
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async searchDeploymentData () {
    try {
      let { bcSearch, address, blockNumber } = this
      if (blockNumber === 'latest') blockNumber = undefined
      let dBlockNumber = await bcSearch.deploymentBlock(address, blockNumber)
      if (!dBlockNumber) throw new Error('Missing deployment block')
      let data = await bcSearch.deploymentTx(address, { blockNumber: dBlockNumber })
      if (!data) throw new Error(`Missing deployment data for ${address}`)
      if (!data.tx && !data.internalTx) throw new Error(`Invalid deployment data for ${address}`)
      let tx
      if (data.tx) {
        tx = createTxObject(data.tx, data)
      } else {
        let { timestamp } = data
        let { initConfig } = this
        let itx = new InternalTx(Object.assign({ timestamp }, data.internalTx), { initConfig })
        tx = itx.getData()
      }
      return { tx, deployedCode: getDeployedCode(tx, address) }
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getFromDb () {
    try {
      let { dbData, collection, address } = this
      if (dbData) return dbData
      if (!collection) return
      dbData = await collection.findOne({ address })
      this.dbData = dbData
      return dbData
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
    let { address } = this
    try {
      await this.fetch()
      let data = this.getData(true)
      let { collection, dbData } = this
      // Optimization
      for (let p in dbData) {
        if (data[p] === dbData[p]) delete data[p]
      }
      if (Object.keys(data).length < 1) return
      data.address = address
      let result = await saveAddressToDb(data, collection)
      return result
    } catch (err) {
      this.log.error(`Error updating address ${address}`)
      return Promise.reject(err)
    }
  }

  isContract () {
    let { code, type } = this.getData()
    let { isNative, address } = this
    if (undefined === code && !isNative && !isZeroAddress(address)) {
      throw new Error(`Run getCode first ${address}`)
    }
    return type === addrTypes.CONTRACT
  }

  makeContract (deployedCode, dbData) {
    if (this.contract) return this.contract
    let { address, nod3, initConfig, collections, block } = this
    this.contract = new Contract(address, deployedCode, { dbData, nod3, initConfig, collections, block })
  }

  async getContract () {
    try {
      await this.fetch()
      return this.contract
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

function getDeployedCode (tx, address) {
  if (!tx) return
  let contractAddress, code
  // normal tx
  if (tx.receipt) {
    contractAddress = tx.receipt.contractAddress
    code = tx.input
  }
  // internal tx
  if (tx.type && tx.type === 'create') {
    contractAddress = tx.result.address
    code = tx.action.init
  }
  if (contractAddress === address) return code
}

/**
 * Address data proxy
 */
function createAddressData ({ address, isNative, name }) {
  const type = (isNative) ? addrTypes.CONTRACT : addrTypes.ADDRESS
  const dataHandler = {
    set: function (data, prop, val) {
      let protectedProperties = ['address', 'type', 'isNative', '_id']
      if (protectedProperties.includes(prop)) return true
      switch (prop) {
        case 'code':
          if (isNullData(val)) val = null
          if (val) {
            data.type = addrTypes.CONTRACT
          }
          // Fix to support suicide
          data.code = val
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

export async function saveAddressToDb (data, collection) {
  try {
    let { address } = data
    if (!isAddress(address)) throw new Error(`Invalid address ${address}`)
    let { result } = await collection.updateOne({ address }, { $set: data }, { upsert: true })
    return result
  } catch (err) {
    return Promise.reject(err)
  }
}

export default Address

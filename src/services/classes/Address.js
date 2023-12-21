import { BcThing } from './BcThing'
import { isBlockObject, isNullData, isAddress, isValidBlockNumber } from '../../lib/utils'
import { fields, addrTypes } from '../../lib/types'
import Contract from './Contract'
import { BcSearch } from '@rsksmart/rsk-contract-parser'
import { createTxObject } from './Tx'
import { InternalTx, checkInternalTransactionData } from './InternalTx'
import { isZeroAddress } from '@rsksmart/rsk-utils'
import { getNativeContractName, isNativeContract } from '../../lib/NativeContracts'

export class Address extends BcThing {
  constructor (address, { nod3, initConfig, tx, block, log } = {}) {
    super({ nod3, initConfig, log, name: 'Address' })
    if (!this.isAddress(address)) throw new Error((`Invalid address: ${address}`))
    this.isZeroAddress = isZeroAddress(address)
    this.bcSearch = BcSearch(nod3)
    this.address = address
    this.fetched = false
    this.contract = undefined
    this.block = undefined
    this.blockNumber = undefined
    this.name = getNativeContractName(address) // undefined for other contracts
    this.isNative = isNativeContract(address)
    this.dbData = undefined
    this.blockCode = undefined
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
      if (this.isZeroAddress || this.isNative) {
        this.blockCode = null
      }
      let { nod3, address, blockNumber, blockCode } = this
      if (blockCode !== undefined) return blockCode

      blockCode = await nod3.eth.getCode(address, blockNumber)
      blockCode = (isNullData(blockCode)) ? null : blockCode
      this.blockCode = blockCode
      return blockCode
    } catch (err) {
      return Promise.reject(err)
    }
  }

  saveCode () {
    let { code } = this.getData()
    if (code) return
    let { blockCode } = this
    if (!blockCode) return
    code = blockCode
    let codeStoredAtBlock = this.blockNumber
    this.setData({ code, codeStoredAtBlock })
  }

  async fetch (forceFetch) {
    try {
      if (this.fetched && !forceFetch) return this.getData(true)
      let dbData = {}
      this.setData(dbData)

      let { blockNumber } = this

      let storedBlock = this.data.blockNumber || 0
      if (storedBlock <= blockNumber) {
        let balance = await this.getBalance('latest')
        this.setData({ balance, blockNumber })
      }

      let code = await this.getCode()
      this.saveCode()
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
        this.makeContract(deployedCode)
        let contractData = await this.contract.fetch()
        // prevent update this fields from contractData
        delete contractData.balance
        delete contractData.blockNumber
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
      let { dbData, address } = this
      if (dbData) return dbData
      dbData = await this.repository.findOne({ address }, {})
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
      let { dbData } = this
      // Optimization
      for (let p in dbData) {
        if (data[p] === dbData[p]) delete data[p]
      }
      if (Object.keys(data).length < 1) return
      data.address = address
      const result = await saveAddressToDb(data)
      return result
    } catch (err) {
      this.log.error(`Error updating address ${address}`)
      return Promise.reject(err)
    }
  }

  isContract () {
    let { address, blockCode } = this
    if (undefined === blockCode) {
      throw new Error(`Run getCode first ${address}`)
    }
    return !!blockCode
  }

  makeContract (deployedCode) {
    const dbData = Object.assign({}, this.getData(true))
    if (this.contract) return this.contract
    let { address, nod3, initConfig, block } = this
    this.contract = new Contract(address, deployedCode, { dbData, nod3, initConfig, block })
  }

  async getContract () {
    try {
      await this.fetch()
      return this.contract
    } catch (err) {
      return Promise.reject(err)
    }
  }

  suicide (destroyedBy) {
    let data = {}
    data[fields.DESTROYED_BY] = destroyedBy
    this.setData(data)
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
          if (val && data[fields.DESTROYED_BY] === undefined) {
            data.type = addrTypes.CONTRACT
          }
          // Fix to support suicide
          data.code = val
          break

        case fields.DESTROYED_BY:
          if (data[prop] !== undefined) return true
          val = checkInternalTransactionData(Object.assign({}, val))
          data[prop] = val
          data.type = addrTypes.ADDRESS
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

export async function saveAddressToDb (data) {
  try {
    let { address } = data
    if (!isAddress(address)) throw new Error(`Invalid address ${address}`)
    let result = await Promise.all(this.repository.insertOne(data))
    return result
  } catch (err) {
    return Promise.reject(err)
  }
}

export default Address

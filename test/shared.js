import crypto from 'crypto'
import DB from '../src/lib/Db'
import { makeConfig, config as userConfig } from '../src/lib/config'
import defaultConfig from '../src/lib/defaultConfig'
import collections from '../src/lib/collections'
import { getDbBlocksCollections } from '../src/lib/blocksCollections'
import NativeContracts from '../src/lib/NativeContracts'
import initialConfiguration from '../src/lib/initialConfiguration'
import { addrTypes } from '../src/lib/types'
import net from 'net'

const defaultNet = { id: '31', name: 'RSK Testnet' }

export const initConfig = Object.assign(Object.assign({}, initialConfiguration), { net: defaultNet })

export const config = makeConfig()
export const nativeContracts = NativeContracts(initConfig)
const testDatabase = 'dbToTest'

const getDbName = config => config.db.database

const writeOnlyDbs = [getDbName(userConfig), getDbName(defaultConfig)]

export const testDb = ({ dbName } = {}) => {
  dbName = dbName || testDatabase
  if (writeOnlyDbs.includes(dbName)) throw new Error(`Don't use production databases to test!!!`)
  const dbConf = Object.assign(config.db, { database: dbName })
  const database = new DB(dbConf)
  database.setLogger(null)
  let db
  const getDb = async () => {
    if (!db) db = await database.db()
    return db
  }
  const dropDb = () => getDb().then(db => db.dropDatabase())
  return Object.freeze({ getDb, dropDb, db: database, config })
}

export const testCollections = async (dropDb, database) => {
  database = database || testDb()
  if (dropDb) await database.dropDb()
  const db = await database.getDb()
  const names = defaultConfig.collectionsNames
  await database.db.createCollections(collections, { names })
  const colls = await getDbBlocksCollections(db)
  return colls
}

export const fakeBlocks = (count = 10, { max, addTimestamp } = {}) => {
  let blocks = [...new Array(count)].map(i => fakeBlock(max))
  if (addTimestamp) {
    const time = Date.now()
    blocks = blocks.map(block => {
      block.timestamp = new Date(time - block.number).getTime()
      return block
    })
  }
  return blocks
}

export const randomBlockHash = () => '0x' + crypto.randomBytes(32).toString('hex')

export const randomNumber = (max, min = 1) => {
  max = max || Number.MAX_SAFE_INTEGER
  return Math.floor(Math.random() * max) + min
}

export const randomBlockNumber = (max, min = 0) => {
  max = max || 10 ** 6
  return randomNumber(max, min)
}

export const fakeTx = (transactionIndex, { hash, number }) => {
  let blockHash = hash || randomBlockHash()
  let blockNumber = number || randomBlockNumber()
  return { blockHash, blockNumber, transactionIndex }
}

export const fakeBlock = (max) => {
  let number = randomBlockNumber(max)
  let hash = randomBlockHash()
  let miner = randomAddress()
  let txs = randomNumber(10)
  let transactions = [...Array(txs)].map(() => randomBlockHash())
  return { hash, number, miner, transactions }
}

export const randomAddress = () => `0x${crypto.randomBytes(20).toString('hex')}`

export const randomBalance = () => `0x${crypto.randomBytes(4).toString('hex')}`

export const fakeAddress = (code) => {
  let address = randomAddress()
  let balance = randomBalance()
  let type = addrTypes.ADDRESS
  let name
  let isNative = false
  let data = { address, balance, name, isNative, type }
  if (undefined !== code) data.code = code
  return data
}

export const fakeInternalTx = ({ action, result, _index, type, blockHash, blockNumber, transactionHash, traceAddress } = {}) => {
  blockHash = blockHash || randomBlockHash()
  transactionHash = transactionHash || randomBlockHash()
  blockNumber = blockNumber || randomBlockNumber()
  _index = _index || randomNumber(10)
  action = action || {}
  type = type || 'call'
  let timestamp = randomTimestamp()
  let transactionPosition = randomNumber(10)
  let subtraces = 0
  traceAddress = traceAddress || []
  result = result || {}
  return { type, subtraces, traceAddress, result, blockHash, transactionHash, transactionPosition, blockNumber, action, _index, timestamp }
}

export function Spy (obj, method) {
  let spy = {
    args: []
  }
  const org = obj[method]
  if (typeof org !== 'function') throw new Error(`The method ${method} is not a function`)
  obj[method] = function () {
    let args = [].slice.apply(arguments)
    spy.args.push(args)
    return org.call(obj, ...args)
  }
  const remove = () => {
    obj[method] = org
  }
  return Object.freeze({ spy, remove })
}

export function isPortInUse (port, host) {
  host = host || '127.0.0.1'
  if (isNaN(port)) throw new Error('Port must be a number')
  return new Promise((resolve, reject) => {
    const server = net.createServer()
      .once('error', err => (err.code === 'EADDRINUSE' ? resolve(true) : reject(err)))
      .once('listening', () => {
        server.once('close', () => resolve(false))
        server.close()
      })
      .listen(port, host)
  })
}

export function asyncWait (time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export function isRejected (promise) {
  return promise.then(() => false).catch(err => Promise.resolve(() => { throw err }))
}

export function randomTimestamp ({ start, end, unix } = {}) {
  start = start || new Date(2018, 1, 2).getTime()
  end = end || new Date().getTime()
  let time = new Date(start + Math.random() * (end - start)).getTime()
  if (unix) time = Math.floor(time / 1000)
  return time
}

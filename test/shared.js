import crypto from 'crypto'
import DB from '../src/lib/Db'
import config from '../src/lib/config'
import { getDbBlocksCollections } from '../src/lib/blocksCollections'
import NativeContracts from '../src/lib/NativeContracts'
import initConfig from '../src/lib/initialConfiguration'
import { addrTypes } from '../src/lib/types'
import net from 'net'
import assert from 'assert'

export const nativeContracts = NativeContracts(initConfig)
const testDatabase = 'dbToTest'

export const testDb = ({ dbName } = {}) => {
  dbName = dbName || testDatabase
  const dbConf = Object.assign(config.db, { database: dbName })
  const database = new DB(dbConf)
  let db
  const getDb = async () => {
    if (!db) db = await database.db()
    return db
  }
  const dropDb = () => getDb().then(db => db.dropDatabase())
  return Object.freeze({ getDb, dropDb })
}

export const testCollections = async (dropDb) => {
  const database = testDb()
  if (dropDb) await database.dropDb()
  const db = await database.getDb()
  const collections = await getDbBlocksCollections(db)
  return collections
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

export const randomBlockNumber = (max) => {
  max = max || 10 ** 6
  return Math.floor(Math.random() * max)
}

export const fakeBlock = (max) => {
  let number = randomBlockNumber(max)
  let hash = randomBlockHash()
  return { hash, number }
}

export const fakeTx = (transactionIndex, { hash, number }) => {
  let blockHash = hash || randomBlockHash()
  let blockNumber = number || randomBlockNumber()
  return { blockHash, blockNumber, transactionIndex }
}

export const randomAddress = () => `0x${crypto.randomBytes(20).toString('hex')}`

export const randomBalance = () => `0x${crypto.randomBytes(4).toString('hex')}`

export const fakeAddress = (code = null) => {
  let address = randomAddress()
  let balance = randomBalance()
  let type = addrTypes.ADDRESS
  let name
  let isNative = false
  return { address, balance, name, isNative, type, code }
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

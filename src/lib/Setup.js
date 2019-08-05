import collections from './collections'
import config from './config'
import DB from './Db.js'
import { StoredConfig } from './StoredConfig'
import nod3 from './nod3Connect'
import initConfig from './initialConfiguration'
import NativeContracts from './NativeContracts'

export const dataBase = new DB(config.db)

export async function Setup ({ log } = {}) {
  log = log || console
  dataBase.setLogger(log)
  const db = await dataBase.db()
  const storedConfig = StoredConfig(db)

  const createCollections = async () => {
    const names = config.collectionsNames
    const validate = config.validateCollections
    return dataBase.createCollections(collections, { names, validate })
  }

  const getInitConfig = async () => {
    try {
      await nod3.isConnected().catch(err => {
        log.debug(err)
        throw new Error(`Cannot connect to the node`)
      })
      const net = await nod3.net.version()
      return Object.assign(initConfig, { net })
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const checkSetup = async () => {
    try {
      const current = await getInitConfig()
      let stored = await storedConfig.getConfig()
      if (!stored) {
        log.info(`Saving initial configuration to db`)
        await storedConfig.saveConfig(current)
        return checkSetup()
      }
      if (stored.net.id !== current.net.id) {
        throw new Error(`Network stored id (${stored.net.id}) is not equal to node network id (${current.net.id})`)
      }
      return stored
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const start = async () => {
    try {
      const initConfig = await checkSetup()
      const nativeContracts = NativeContracts(initConfig)
      return { initConfig, db, nativeContracts }
    } catch (err) {
      log.error(err)
      process.exit(9)
    }
  }
  return Object.freeze({ start, createCollections, checkSetup })
}

export default Setup

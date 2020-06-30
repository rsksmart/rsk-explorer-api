import collections from './collections'
import config from './config'
import DB from './Db.js'
import { StoredConfig } from './StoredConfig'
import nod3 from './nod3Connect'
import initConfig from './initialConfiguration'
import { getDbBlocksCollections } from './blocksCollections'

export const dataBase = new DB(config.db)

export async function getNetInfo (nod3) {
  try {
    let net = await nod3.net.version()
    return net
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function Setup ({ log } = {}) {
  log = log || console
  dataBase.setLogger(log)
  const db = await dataBase.db()
  const storedConfig = StoredConfig(db)

  const createCollections = async (names) => {
    names = names || config.collectionsNames
    const validate = config.blocks.validateCollections
    return dataBase.createCollections(collections, { names, validate })
  }

  const getInitConfig = async () => {
    try {
      await nod3.isConnected().catch(err => {
        log.debug(err)
        throw new Error(`Cannot connect to the node`)
      })
      const net = await getNetInfo(nod3)
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
        await createCollections()
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

  const getCollections = (db) => {
    return getDbBlocksCollections(db)
  }

  const start = async (skipCheck) => {
    try {
      let initConfig
      if (skipCheck) initConfig = await storedConfig.getConfig()
      else initConfig = await checkSetup()
      if (!initConfig) throw new Error(`invalid init config, run checkSetup first`)
      const collections = await getCollections(db)
      return { initConfig, db, collections }
    } catch (err) {
      log.error(err)
      process.exit(9)
    }
  }

  return Object.freeze({ start, createCollections, checkSetup, getInitConfig })
}

export default Setup

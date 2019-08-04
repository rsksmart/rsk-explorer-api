import collections from './collections'
import config from './config'
import { dataBase } from './dataSource'
import { StoredConfig } from './StoredConfig'
import nod3 from './nod3Connect'

export async function Setup ({ log }) {
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
      const timestamp = Date.now()
      return { net, timestamp }
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const checkSetup = async () => {
    try {
      const current = await getInitConfig()
      let stored = await storedConfig.getInitConfig()
      if (!stored) {
        await storedConfig.saveConfig(current)
        return checkSetup()
      }
      if (stored.net.id !== current.net.id) {
        throw new Error(`Network stored id (${stored.net.id}) is not equal to node network id (${current.net.id})`)
      }
      return true
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const start = async () => {
    try {
      await checkSetup()
      return { db, nod3 }
    } catch (err) {
      log.error(err)
      process.exit(9)
    }
  }
  return Object.freeze({ start, createCollections, checkSetup })
}

export default Setup

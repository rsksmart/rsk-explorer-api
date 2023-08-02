import { config as defaultConfig } from './config'
import { Db } from './Db'
import { StoredConfig } from './StoredConfig'
import { nod3 as nod3Default } from './nod3Connect'
import initConfig from './initialConfiguration'
import { hash } from './utils'

export const INIT_ID = '_explorerInitialConfiguration'
export const CONFIG_ID = '_explorerConfig'

const readOnlyDocsIds = [INIT_ID]

export function networkError (storedInitConfig, initConfig) {
  return `Network stored id (${storedInitConfig.net.id}) is not equal to node network id (${initConfig.net.id})`
}

export async function getNetInfo (nod3) {
  try {
    let net = await nod3.net.version()
    return net
  } catch (err) {
    return Promise.reject(err)
  }
}

const defaultInstances = { nod3: nod3Default, config: defaultConfig }

export let prismaClient

export async function Setup ({ log = console }, { nod3, config } = defaultInstances) {
  const database = new Db({ log, ...config.db })
  const storedConfig = StoredConfig(readOnlyDocsIds)

  const createHash = thing => hash(thing, 'sha1', 'hex')

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

  const checkStoredHash = async (id, value) => {
    if (!id || !value) throw new Error(`Invalid id or value id:${id} value:${value}`)
    const currentHash = createHash(value)
    const storedDoc = await storedConfig.get(id)
    if (!storedDoc) return false
    return currentHash === storedDoc.hash
  }

  const checkConfig = async () => {
    const testConfig = await checkStoredHash(CONFIG_ID, config)
    return !!(testConfig)
  }

  const saveConfig = async () => {
    try {
      await storedConfig.update(CONFIG_ID, { hash: createHash(config) }, { create: true })
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const checkSetup = async () => {
    try {
      const initConfig = await getInitConfig()
      const storedInitConfig = await storedConfig.get(INIT_ID)
      const configMatches = await checkConfig()
      if (!storedInitConfig || !configMatches) {
        await saveConfig()
        if (!storedInitConfig) {
          log.info(`Saving initial configuration to db`)
          await storedConfig.save(INIT_ID, initConfig)
          return checkSetup()
        }
      }
      if (storedInitConfig.net.id !== initConfig.net.id) {
        throw new Error(networkError(storedInitConfig, initConfig))
      }
      return storedInitConfig
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const start = async (skipCheck) => {
    try {
      let initConfig
      if (skipCheck) {
        initConfig = await storedConfig.get(INIT_ID)
      } else {
        initConfig = await checkSetup()
      }
      if (!initConfig) throw new Error(`invalid init config, run checkSetup first`)
      return { initConfig }
    } catch (err) {
      log.error(err)
      return Promise.reject(err)
    }
  }

  prismaClient = database.prismaClient

  return Object.freeze({ start, createHash })
}

export default Setup

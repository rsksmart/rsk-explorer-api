import { config as defaultConfig } from './config'
import { nod3 as nod3Default } from './nod3Connect'
import initConfig from './initialConfiguration'
import { hash } from './utils'
import { REPOSITORIES } from '../repositories'
import { EXPLORER_INITIAL_CONFIG_ID, EXPLORER_SETTINGS_ID } from './defaultConfig'

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

export async function Setup ({ log = console }, { nod3, config } = defaultInstances) {
  const createHash = thing => hash(thing, 'sha1', 'hex')
  const { Config: configRepository } = REPOSITORIES

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

  const checkStoredSettingsHash = async (settings) => {
    if (!settings) throw new Error(`Invalid settings: ${settings}`)
    const currentSettingsHash = createHash(settings)
    const storedSettings = await configRepository[EXPLORER_SETTINGS_ID].get()
    if (!storedSettings) return false
    return currentSettingsHash === storedSettings.hash
  }

  const checkSetup = async () => {
    try {
      const initConfig = await getInitConfig()
      const storedInitConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
      const settingsMatches = await checkStoredSettingsHash(config)

      if (!storedInitConfig) {
        log.info(`Saving initial explorer configuration`)
        await configRepository[EXPLORER_INITIAL_CONFIG_ID].save(initConfig)
        return checkSetup()
      }

      if (!settingsMatches) {
        log.info(`Updating settings`)
        await configRepository[EXPLORER_SETTINGS_ID].upsert({ hash: createHash(config) })
      }

      if (storedInitConfig.net.id !== initConfig.net.id) throw new Error(networkError(storedInitConfig, initConfig))
      return storedInitConfig
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const start = async (skipCheck) => {
    try {
      let initConfig
      if (skipCheck) {
        initConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
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

  return Object.freeze({ start, createHash })
}

export default Setup

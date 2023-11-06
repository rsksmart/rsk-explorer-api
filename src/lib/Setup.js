import { config as defaultConfig } from './config'
import { createHash } from './utils'
import { configRepository } from '../repositories'
import { EXPLORER_INITIAL_CONFIG_ID, EXPLORER_SETTINGS_ID } from './defaultConfig'
import { nod3 } from './nod3Connect'
import { nativeContracts, validateNativeContracts } from './NativeContracts'

export async function createInitConfig ({ log = console } = {}) {
  try {
    validateNativeContracts(nativeContracts)
    const net = await nod3.net.version() // Note: Throws an unhandled error if no node is found

    return { nativeContracts, net }
  } catch (err) {
    log.error('Error creating initial configuration')
    log.error(err)
  }
}

export const getInitConfig = () => configRepository[EXPLORER_INITIAL_CONFIG_ID].get()

export function Setup ({ log = console } = {}, { config = defaultConfig } = {}) {
  const sameNetwork = (stored, current) => (stored && stored.net.id === current.net.id)
  const sameSettingsHash = (stored, current) => stored && stored.hash === current
  const start = async ({ skipCheck } = {}) => {
    try {
      const currentInitConfig = await createInitConfig({ log })
      if (skipCheck) {
        log.warn('Skipped initial configuration check (beware that switching the network will generate inconsistencies)')
        return { initConfig: currentInitConfig }
      }

      // Check init config existence
      let storedInitConfig = await getInitConfig()

      if (!storedInitConfig) {
        await configRepository[EXPLORER_INITIAL_CONFIG_ID].save(currentInitConfig)
        log.info(`Saved initial explorer configuration`)

        storedInitConfig = await getInitConfig()
      }

      // Validate network
      if (!sameNetwork(storedInitConfig, currentInitConfig)) throw new Error(`Mismatching node network ids (Stored: ${storedInitConfig.net.id}, current: ${currentInitConfig.net.id})`)

      // Validate settings
      const settingsHash = createHash(config)
      const storedSettings = await configRepository[EXPLORER_SETTINGS_ID].get()

      if (!sameSettingsHash(storedSettings, settingsHash)) {
        await configRepository[EXPLORER_SETTINGS_ID].upsert({ hash: settingsHash })
        log.info(`Saved new settings`)
      }

      log.info(`Initial configuration check passed. Current network: ${storedInitConfig.net.name}`)
      return { initConfig: storedInitConfig }
    } catch (err) {
      log.error('Error at setup start')
      log.error(err)
    }
  }

  return Object.freeze({ start })
}

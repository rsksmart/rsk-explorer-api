import defaultCollections from './collections'
import { config as defaultConfig } from './config'
import DB from './Db.js'
import { StoredConfig } from './StoredConfig'
import { nod3 as nod3Default } from './nod3Connect'
import initConfig from './initialConfiguration'
import { getDbBlocksCollections } from './blocksCollections'
import { hash } from './utils'
import { PrismaClient } from '@prisma/client'

export const INIT_ID = '_explorerInitialConfiguration'
export const COLLECTIONS_ID = '_explorerCollections'
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

const defaultInstances = { nod3: nod3Default, config: defaultConfig, collections: defaultCollections }

export let prismaClient = null

async function loadPrismaClient(config) {
  const url = generatePrismaURL(config)

  prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: url
      },
    },
  })
}

function generatePrismaURL(config) {
  const { user, password, server, prismaPort, prismaDbName } = config;

  const credentials = `${ user || 'postgres' }:${ password || 12345678 }`
  const database = `${ server || 'localhost' }:${ prismaPort || 5432 }/${ prismaDbName || 'explorer_db' }`

  let url = `postgres://${credentials}@${database}`
  console.log(url)
  return url
}

export async function Setup ({ log } = {}, { nod3, config, collections } = defaultInstances) {
  const database = new DB(config.db)
  if (undefined !== log) database.setLogger(log)
  log = database.getLogger()
  const db = await database.db()
  const storedConfig = StoredConfig(db, readOnlyDocsIds)

  const createHash = thing => hash(thing, 'sha1', 'hex')

  const createCollections = async (names) => {
    names = names || config.collectionsNames
    const validate = config.blocks.validateCollections
    return database.createCollections(collections, { names, validate })
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

  const checkStoredHash = async (id, value) => {
    if (!id || !value) throw new Error(`Invalid id or value id:${id} value:${value}`)
    const currentHash = createHash(value)
    const storedHash = await storedConfig.get(id)
    if (!storedHash) return false
    return currentHash === storedHash.hash
  }

  const checkConfig = async () => {
    const testConfig = await checkStoredHash(CONFIG_ID, config)
    const testCollections = await checkStoredHash(COLLECTIONS_ID, collections)
    return !!(testConfig && testCollections)
  }

  const saveConfig = async () => {
    try {
      await storedConfig.update(CONFIG_ID, { hash: createHash(config) }, { create: true })
      await storedConfig.update(COLLECTIONS_ID, { hash: createHash(collections) }, { create: true })
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
        await createCollections()
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

  const getCollections = (db) => {
    return getDbBlocksCollections(db)
  }

  const start = async (skipCheck) => {
    try {
      let initConfig
      if (skipCheck) initConfig = await storedConfig.get(INIT_ID)
      else initConfig = await checkSetup()
      if (!initConfig) throw new Error(`invalid init config, run checkSetup first`)
      const collections = await getCollections(db)
      return { initConfig, db, collections }
    } catch (err) {
      log.error(err)
      return Promise.reject(err)
    }
  }

  await loadPrismaClient(config)

  return Object.freeze({ start, createHash })
}

export default Setup

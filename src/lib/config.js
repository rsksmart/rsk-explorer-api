import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import defaultConf from './defaultConfig'

dotenv.config()

const validateConfig = {
  existence: (config) => {
    if (!config) {
      throw new Error('config is required')
    }
  }
}

export function createConfig (file) {
  const config = makeConfig(loadConfig(file))

  // validations
  validateConfig.existence(config)

  return config
}

/**
 * Validates an http/https URL environment variable, used consistently across the URL-bearing envs.
 * @param {string} value - The raw environment value.
 * @param {string} name - The variable name, for error messages (its value is never echoed).
 * @returns {string} The validated value.
 */
function requireHttpUrl (value, name) {
  let url
  try {
    url = new URL(value)
  } catch (error) {
    throw new Error(`${name} must be a valid URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must be an http or https URL`)
  }
  return value
}

/**
 * Splits a comma-separated BITCOIN_RPC_URL into a trimmed list of endpoints,
 * supporting multiple endpoints for failover.
 * @param {string} [value] - The raw BITCOIN_RPC_URL value (e.g. 'http://a:8332, http://b:8332').
 * @returns {string[]} The trimmed, non-empty endpoints in order (e.g. ['http://a:8332', 'http://b:8332']); [] when unset.
 */
const parseEndpointList = value =>
  (value || '').split(',').map(s => s.trim()).filter(Boolean)

/**
 * Reads an opt-in boolean environment flag: the feature is off unless explicitly enabled.
 * @param {string} [value] - The raw environment value (e.g. 'true', '1', 'yes', 'on').
 * @returns {boolean} true only when value is one of 'true'/'1'/'yes'/'on' (case-insensitive); false otherwise, including when unset.
 */
const parseBooleanFlag = value =>
  ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase())

export function makeConfig (config = {}) {
  // const defaultLogs = (key) => {
  //   const dir = config.log.dir
  //   if (!dir) return
  //   config[key].log = config[key].log || {}
  //   config[key].log.file = config[key].log.file || `${dir}/${key}.json`
  //   config[key].log.level = config[key].log.level || config.log.level || 'info'
  // }

  const keys = Object.keys(defaultConf)

  for (let key of keys) {
    config[key] = config[key] || defaultConf[key]
    for (let p in defaultConf[key]) {
      if (undefined === config[key][p]) config[key][p] = defaultConf[key][p]
    }
  }

  // enable undefined modules
  for (let module in defaultConf.api.modules) {
    config.api.modules[module] = config.api.modules[module] !== false
  }

  // defaults services
  const services = config.blocks.services || {}
  for (let s in defaultConf.blocks.services) {
    services[s] = config.blocks.services[s] !== false
  }
  config.blocks.services = services
  // defaults  servers/ports

  if (process.env.RSK_NODE_URL) {
    config.source = { url: requireHttpUrl(process.env.RSK_NODE_URL, 'RSK_NODE_URL') }
  } else {
    console.log('WARNING: RSK_NODE_URL is not set, using default', defaultConf.DEFAULT_RSK_NODE_URL)
    config.source = { url: defaultConf.DEFAULT_RSK_NODE_URL }
  }

  config.source = nodeSources(config.source)
  config.blocks.source = config.source

  config.bitcoin.rpcUrl = parseEndpointList(process.env.BITCOIN_RPC_URL)
  config.bitcoin.enabled = parseBooleanFlag(process.env.BITCOIN_STATS_ENABLED)

  // defaults log files
  // if (config.log.logToFiles === true) {
  //   defaultLogs('api')
  //   defaultLogs('blocks')
  // }

  return config
}

function loadConfig (file) {
  let config = {}
  if (file) {
    try {
      file = path.resolve(__dirname, file)
      if (fs.existsSync(file)) config = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch (err) {
      console.log(err)
      process.exit(8)
    }
  }
  return config
}

export function nodeSources (sources) {
  if (!Array.isArray(sources)) sources = [sources]
  sources = sources.map(s => createNodeSource(s))
  sources = Object.values(sources.reduce((v, a, i) => {
    let { url } = a
    v[url] = a
    return v
  }, {})
  )
  return (sources.length > 1) ? sources : sources[0]
}

export function createNodeSource (s) {
  return { url: s.url || `${s.protocol}://${s.node}:${s.port}` }
}

export const config = createConfig('../../config.json')

export default config

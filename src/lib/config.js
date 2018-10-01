import config from '../../config.json'
import defaultConf from './defaultConfig'
const keys = Object.keys(defaultConf)

for (let key of keys) {
  config[key] = config[key] || defaultConf[key]
  for (let p in defaultConf[key]) {
    if (undefined === config[key][p]) config[key][p] = defaultConf[key][p]
  }
}

// defaults  servers/ports

config.blocks.node = config.blocks.node || config.source.node
config.blocks.port = config.blocks.port || config.source.port

let s = config.source
config.source.url = `${s.protocol}://${s.node}:${s.port}`

// defaults log files

defaultLogs('api')
defaultLogs('blocks')

// tx addresses
publicSettings('bridgeAddress')
publicSettings('remascAddress')

function publicSettings (key) {
  config[key] = config.publicSettings[key] || null
}

function defaultLogs (key) {
  const dir = config.log.dir
  if (!dir) return
  config[key].log = config[key].log || {}
  config[key].log.file = config[key].log.file || `${dir}/${key}.json`
  config[key].log.level = config[key].log.level || config.log.level || 'error'
}

export default config

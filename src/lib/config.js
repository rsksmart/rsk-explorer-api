import path from 'path'
import fs from 'fs'

import defaultConf from './defaultConfig'
const keys = Object.keys(defaultConf)
const config = loadConfig()
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
config.source.url = config.source.url || `${s.protocol}://${s.node}:${s.port}`

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

function loadConfig () {
  let config = {}
  try {
    let file = path.resolve(__dirname, '../../config.json')
    if (fs.existsSync(file)) config = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (err) {
    console.log(err)
    process.exit(8)
  }
  return config
}

export default config

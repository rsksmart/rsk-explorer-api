import path from 'path'
import fs from 'fs'
import URL from 'url'
import defaultConf from './defaultConfig'

export const config = createConfig('../../config.json')

export function createConfig (file) {
  return makeConfig(loadConfig(file))
}

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
  config.source = nodeSources(config.source)
  config.blocks.source = config.source

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
  let url = s.url || `${s.protocol}://${s.node}:${s.port}`
  let { protocol, port, hostname: node } = URL.parse(url)
  protocol = protocol.replace(/:$/, '')
  return { protocol, node, port, url }
}

export default config

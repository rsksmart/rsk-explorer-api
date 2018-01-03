import config from '../../config.json'
import defaultConf from './defaultConfig'
const keys = Object.keys(defaultConf)

for (let key of keys) {
  config[key] = config[key] || defaultConf[key]
  for (let p in defaultConf[key]) {
    if (!config[key][p]) config[key][p] = defaultConf[key][p]
  }
}
// defaults  servers/ports
config.erc20.node = config.erc20.node || config.source.node
config.erc20.port = config.erc20.port || config.source.port

config.blocks.node = config.blocks.node || config.source.node
config.blocks.port = config.blocks.port || config.source.port

export default config

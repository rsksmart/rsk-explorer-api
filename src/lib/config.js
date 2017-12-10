import config from '../../config.json'
import defaultConf from './defaultConfig'

const keys = Object.keys(defaultConf)

for (let key of keys) {
  config[key] = config[key] || defaultConf[key]
  for (let p in defaultConf[key]) {
    if (!config[key][p]) config[key][p] = defaultConf[key][p]
  }
}
config.erc20.server = config.erc20.server || config.source.server
config.erc20.port = config.erc20.port || config.source.port
export default config

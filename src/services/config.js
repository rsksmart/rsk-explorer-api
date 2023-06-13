
import config from '../lib/config'
import { enabledServices } from '../lib/defaultConfig'

export const services = Object.values(enabledServices)
const cwd = `${__dirname}/`
const scriptName = name => `${name}.js`

export const paths = services.map(serviceName => cwd + scriptName(serviceName))

export const apps = services.map(serviceName => {
  const { log } = config
  const script = scriptName(serviceName)
  const conf = {
    name: serviceName,
    script,
    cwd
  }

  if (log && log.dir) {
    const { dir } = log
    conf.error_file = `${dir}/${serviceName}-error.log`
    conf.out_file = `${dir}/${serviceName}-out.log`
  }
  return conf
})

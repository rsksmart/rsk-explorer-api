
import { servicesNames } from './servicesConfig'

const scripts = Object.values(servicesNames)

const scriptName = name => `${name}.js`

const cwd = `${__dirname}/blocks/`

export const paths = scripts.map(name => cwd + scriptName(name))

export const apps = scripts.map(name => {
  let script = scriptName(name)
  return { name, script, cwd }
})

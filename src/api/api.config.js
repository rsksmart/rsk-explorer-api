import config from '../lib/config'

const cwd = `${__dirname}`
const name = 'explorer-api'
const script = 'index.js'
const { log } = config

const conf = { script, name, cwd }

if (log && log.dir) {
  let { dir } = log
  conf.error_file = `${dir}/${name}-error.log`
  conf.out_file = `${dir}/${name}-out.log`
}


export const apps = [conf]

console.log(apps)
import path from 'path'
import fs from 'fs'
import { isAddress } from './utils'

/**
 *
 */

const defaultConfig = {
  nativeContracts: {
    bridge: '0x0000000000000000000000000000000001000006',
    remasc: '0x0000000000000000000000000000000001000008'
  }
}

const config = checkConfig(Object.assign(loadConfig(), defaultConfig))

function loadConfig () {
  let config = {}
  try {
    let file = path.resolve(__dirname, '../../initial-config.json')
    if (fs.existsSync(file)) config = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (err) {
    console.log(err)
    process.exit(8)
  }
  return config
}

function checkConfig (config) {
  const { nativeContracts } = config
  for (let contract in nativeContracts) {
    let address = nativeContracts[contract]
    if (!isAddress(address)) {
      throw new Error(`Invalid address ${address}, contract:${contract}`)
    }
  }
  return config
}

export default config

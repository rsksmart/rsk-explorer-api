import { existsSync } from 'fs'
import dotenv from 'dotenv'

const name = 'explorer-api'

const envPath = `${__dirname}/../../.env`
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const conf = {
  name,
  script: 'index.js',
  cwd: __dirname,
  env: {
    RSK_NODE_URL: process.env.RSK_NODE_URL
  },
  error_file: `../../logs/api/${name}-error.log`,
  out_file: `../../logs/api/${name}-out.log`
}

export const apps = [conf]

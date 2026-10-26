const name = 'blocks'

const conf = {
  name,
  script: 'index.js',
  cwd: __dirname,
  node_args: '--env-file ../../.env -r dotenv/config',
  env: {
    RSK_NODE_URL: process.env.RSK_NODE_URL
  },
  error_file: `../../logs/blocks/${name}-error.log`,
  out_file: `../../logs/blocks/${name}-out.log`
}

export const apps = [conf]

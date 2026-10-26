const name = 'blocks'

const conf = {
  name,
  script: 'index.js',
  cwd: __dirname,
  node_args: '-r dotenv/config',
  error_file: `../../logs/blocks/${name}-error.log`,
  out_file: `../../logs/blocks/${name}-out.log`
}

export const apps = [conf]

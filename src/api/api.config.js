const name = 'explorer-api'

const conf = {
  name,
  script: 'index.js',
  cwd: __dirname,
  error_file: `../../logs/api/${name}-error.log`,
  out_file: `../../logs/api/${name}-out.log`
}

export const apps = [conf]

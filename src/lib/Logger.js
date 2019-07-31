import bunyan from 'bunyan'

export const Logger = (name, options) => {
  options = options || {}
  let level = options.level || 'trace'
  const log = bunyan.createLogger({
    name,
    level
  })

  if (options.file) {
    log.addStream({
      path: options.file,
      level: options.level || 'info'
    })
  }

  log.on('error', (err, stream) => {
    console.error('Log error ', err)
  })
  return log
}

export default Logger

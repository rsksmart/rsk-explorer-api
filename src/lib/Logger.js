import bunyan from 'bunyan'

export default function (name, options) {
  options = options || {}
  const log = bunyan.createLogger({
    name,
    level: 'debug'
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

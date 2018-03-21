import bunyan from 'bunyan'

export default function (name, options) {
  options = options || {}
  const log = bunyan.createLogger({
    name,
    level: 'debug',
  })

  if (options.path) {
    log.addStream({
      path: options.path,
      level: options.level || 'info'
    })
  }

  log.on('error', (err, stream) => {
    console.error('Log error ', err)
  })
  return log
}
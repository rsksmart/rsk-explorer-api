import Logger from '../lib/Logger'

const log = Logger('[http]')

const httpLogger = (req, res, next) => {
  let msg = `${req.method} ${req.url}`

  if (req.method === 'POST' && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    msg += ` | req.body: ${JSON.stringify(req.body)}`
  }

  log.info(msg)

  next()
}

export default httpLogger

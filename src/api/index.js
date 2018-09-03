import IO from 'socket.io'
import dataSource from '../lib/dataSource'
import Blocks from './Blocks'
import Status from './Status'
import Logger from '../lib/Logger'
import { filterParams } from '../lib/utils'
import http from 'http'
import UserEventsApi from './UserEventsApi'
import config from '../lib/config'
import { errors, formatError, formatRes, publicSettings } from './apiLib'

const port = config.server.port || '3000'
const log = Logger('explorer-api', config.api.log)
const delayedFields = config.api.delayedFields || {}

dataSource.then(db => {
  log.info('Database connected')

  // data collectors
  const blocks = new Blocks(db)
  const status = new Status(db)
  blocks.start()
  status.start()

  const httpServer = http.createServer((req, res) => {
    const url = req.url || null
    if (url && url === '/status') {
      res.writeHead(200, { 'Content-type': 'application/json' })
      res.write(JSON.stringify(status.state))
    } else {
      res.writeHead(404, 'Not Found')
    }
    res.end()
  })
  httpServer.listen(port)
  const io = new IO(httpServer)

  const userEvents = UserEventsApi(io, blocks, log)
  io.httpServer.on('listening', () => {
    log.info('Server listen on port ' + port)
  })

  blocks.events.on('newBlocks', result => {
    io.emit('data', formatRes('newBlocks', result))
  })

  status.events.on('newStatus', result => {
    io.emit('data', formatRes('dbStatus', result))
  })

  io.on('connection', socket => {
    socket.emit('open', { time: Date.now(), settings: publicSettings() })
    socket.emit('data', formatRes('newBlocks', blocks.getLastBlocks()))
    socket.emit('data', formatRes('dbStatus', status.getState()))
    socket.on('message', () => { })
    socket.on('disconnect', () => { })
    socket.on('error', err => {
      log.error('Socket Error: ' + err)
    })

    socket.on('data', payload => {
      if (payload) {
        const action = payload.action
        const params = filterParams(payload.params)
        const delayed = delayedFields[action]
        blocks
          .run(action, params)
          .then(result => {
            if (delayed && userEvents) {
              const registry = !result.data && delayed.runIfEmpty
              if (payload.getDelayed) {
                userEvents.send({
                  action: delayed.action,
                  params,
                  socketId: socket.id,
                  payload,
                  block: blocks.getLastBlock().number
                })
              }
              result.delayed = { fields: delayed.fields, registry }
            }

            socket.emit('data', formatRes(action, result, payload))
          })
          .catch(err => {
            log.debug('Action: ' + action + ' ERROR: ' + err)
            socket.emit(
              'error',
              formatRes(action, null, payload, errors.INVALID_REQUEST)
            )
          })
      } else {
        socket.emit('error', formatError(errors.INVALID_REQUEST))
      }
    })
  })
})

process.on('unhandledRejection', err => {
  log.error(err)
  // process.exit(1)
})

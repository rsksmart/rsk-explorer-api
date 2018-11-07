import IO from 'socket.io'
import dataSource from '../lib/dataSource'
import Blocks from './Blocks'
import Status from './Status'
import TxPool from './TxPool'
import Logger from '../lib/Logger'
import { filterParams } from '../lib/utils'
import http from 'http'
import UserEventsApi from './UserEventsApi'
import config from '../lib/config'
import {
  errors,
  formatError,
  formatRes,
  publicSettings,
  getDelayedFields,
  getModule
} from './apiLib'

const port = config.server.port || '3000'
const log = Logger('explorer-api', config.api.log)

dataSource.then(db => {
  log.info('Database connected')

  // data collectors
  const blocks = new Blocks(db)
  const status = new Status(db)
  const txPool = new TxPool(db)
  blocks.start()
  status.start()
  txPool.start()

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

  // start userEvents api
  const userEvents = UserEventsApi(io, blocks, log)

  io.httpServer.on('listening', () => {
    log.info('Server listen on port ' + port)
  })

  // broadcast new blocks
  blocks.events.on('newBlocks', result => {
    io.emit('data', formatRes({ module: null, action: 'newBlocks', result }))
  })

  // broadcast status
  status.events.on('newStatus', result => {
    io.emit('data', formatRes({ module: null, action: 'dbStatus', result }))
  })

  // broadcast txPool
  txPool.events.on('newPool', result => {
    io.emit('data', formatRes({ module: null, action: 'txPool', result }))
  })

  // broadcast txPool chart
  txPool.events.on('poolChart', result => {
    io.emit('data', formatRes({ module: null, action: 'txPoolChart', result }))
  })

  io.on('connection', socket => {
    socket.emit('open', { time: Date.now(), settings: publicSettings() })
    socket.emit('data', formatRes({ module: null, action: 'newBlocks', result: blocks.getLastBlocks() }))
    socket.emit('data', formatRes({ module: null, action: 'dbStatus', result: status.getState() }))
    socket.emit('data', formatRes({ module: null, action: 'txPool', result: txPool.getState() }))
    socket.emit('data', formatRes({ module: null, action: 'txPoolChart', result: txPool.getPoolChart() }))
    socket.on('message', () => { })
    socket.on('disconnect', () => { })
    socket.on('error', err => {
      log.debug('Socket Error: ' + err)
    })

    // data handler
    socket.on('data', async payload => {
      if (!payload) {
        socket.emit('error', formatError(errors.INVALID_REQUEST))
      } else {
        const action = payload.action
        const params = filterParams(payload.params)
        const module = getModule(payload.module)
        const delayed = getDelayedFields(module, action)
        try {
          let result = await blocks.run(module, action, params)
          if (delayed && userEvents) {
            const registry = !result.data && delayed.runIfEmpty
            if (payload.getDelayed) {
              userEvents.send({
                action: delayed.action,
                module: delayed.module,
                params,
                socketId: socket.id,
                payload,
                block: blocks.getLastBlock().number
              })
            }
            result.delayed = { fields: delayed.fields, registry }
          }
          socket.emit('data', formatRes({ module, action, result, req: payload }))
        } catch (err) {
          log.debug(`Action: ${action}: ERROR: ${err}`)
          socket.emit('error',
            formatRes({ module, action, result: null, req: payload, error: errors.INVALID_REQUEST })
          )
        }
      }
    })
  })
})

process.on('unhandledRejection', err => {
  log.error(err)
  // process.exit(1)
})

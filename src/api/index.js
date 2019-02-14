import IO from 'socket.io'
import dataSource from '../lib/dataSource'
import Blocks from './Blocks'
import Status from './Status'
import TxPool from './TxPool'
import Logger from '../lib/Logger'
import http from 'http'
import UserEventsApi from './UserEventsApi'
import config from '../lib/config'
import {
  errors,
  formatError,
  formatRes,
  publicSettings,
  filterParams,
  getDelayedFields,
  getModule
} from './apiLib'

const port = config.api.port || '3003'
const address = config.api.address || 'localhost'
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
  httpServer.listen(port, address)
  const io = new IO(httpServer)

  // start userEvents api
  const userEvents = UserEventsApi(io, blocks, log)

  io.httpServer.on('listening', () => {
    log.info(`Server listening on: ${address || '0.0.0.0'}:${port}`)
  })

  // broadcast new blocks
  blocks.events.on('newBlocks', result => {
    io.emit('data', formatRes({ action: 'newBlocks', result }))
  })

  // broadcast status
  status.events.on('newStatus', result => {
    io.emit('data', formatRes({ action: 'dbStatus', result }))
  })

  // broadcast txPool
  txPool.events.on('newPool', result => {
    io.emit('data', formatRes({ action: 'txPool', result }))
  })

  // broadcast txPool chart
  txPool.events.on('poolChart', result => {
    io.emit('data', formatRes({ action: 'txPoolChart', result }))
  })

  io.on('connection', socket => {
    socket.emit('open', { time: Date.now(), settings: publicSettings() })
    socket.emit('data', formatRes({ action: 'newBlocks', result: blocks.getLastBlocks() }))
    socket.emit('data', formatRes({ action: 'dbStatus', result: status.getState() }))
    socket.emit('data', formatRes({ action: 'txPool', result: txPool.getState() }))
    socket.emit('data', formatRes({ action: 'txPoolChart', result: txPool.getPoolChart() }))
    socket.on('message', () => { })
    socket.on('disconnect', () => { })
    socket.on('error', err => {
      log.debug('Socket Error: ' + err)
    })

    // data handler
    socket.on('data', async payload => {
      if (!payload) {
        socket.emit('Error', formatError(errors.INVALID_REQUEST))
      } else {
        const action = payload.action
        const params = filterParams(payload.params)
        const module = getModule(payload.module)
        const delayed = getDelayedFields(module, action)
        try {
          const time = Date.now()
          let result = await blocks.run(module, action, params)
          const queryTime = Date.now() - time
          const logCmd = (queryTime > 1000) ? 'warn' : 'trace'
          log[logCmd](`${module}.${action}(${JSON.stringify(params)}) ${queryTime} ms`)

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
          socket.emit('Error',
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

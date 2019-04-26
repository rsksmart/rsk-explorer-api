import IO from 'socket.io'
import dataSource from '../lib/dataSource'
import Api from './Api'
import Status from './Status'
import TxPool from './TxPool'
import log from './lib/log'
import UserEventsApi from './UserEventsApi'
import config from '../lib/config'
import { HttpServer } from './HttpServer'
import { createChannels } from './channels'

import {
  errors,
  formatError,
  formatRes,
  publicSettings,
  filterParams,
  getDelayedFields,
  getModule
} from './lib/apiTools'

const port = config.api.port || '3003'
const address = config.api.address || 'localhost'

dataSource.then(db => {
  log.info('Database connected')

  // data collectors
  const api = new Api(db)
  const status = new Status(db)
  const txPool = new TxPool(db)
  api.start()
  status.start()
  txPool.start()

  // http server
  const httpServer = HttpServer({ blocks: api, status })
  httpServer.listen(port, address)
  const io = new IO(httpServer)

  // start userEvents api
  const userEvents = UserEventsApi(io, api, log)

  io.httpServer.on('listening', () => {
    log.info(`Server listening on: ${address || '0.0.0.0'}:${port}`)
  })

  // create channels
  const channels = createChannels(io)
  const { blocksChannel, statusChannel, txPoolChannel, statsChannel } = channels.channels

  // send blocks on join
  blocksChannel.on('join', socket => {
    socket.emit('data', formatRes({ action: 'newBlocks', result: api.getLastBlocks() }))
  })

  // send status on join
  statusChannel.on('join', socket => {
    socket.emit('data', formatRes({ action: 'dbStatus', result: status.getState() }))
  })

  // send txPool & txPoolChart on join
  txPoolChannel.on('join', socket => {
    socket.emit('data', formatRes({ action: 'txPool', result: txPool.getState() }))
    socket.emit('data', formatRes({ action: 'txPoolChart', result: txPool.getPoolChart() }))
  })

  // send new blocks to channel
  api.events.on('newBlocks', result => {
    blocksChannel.emit('newBlocks', result)
  })

  // send status to channel
  status.events.on('newStatus', result => {
    statusChannel.emit('dbStatus', result)
  })

  // send txPool to channel
  txPool.events.on('newPool', result => {
    txPoolChannel.emit('txPool', result)
  })

  // send txPool chart to channel
  txPool.events.on('poolChart', result => {
    txPoolChannel.emit('txPoolChart', result)
  })

  // send stats to channel
  api.events.on('newStats', result => {
    statsChannel.emit('stats', result)
  })

  io.on('connection', socket => {
    socket.emit('open', { time: Date.now(), settings: publicSettings() })
    socket.on('message', () => { })
    socket.on('disconnect', () => { })
    socket.on('error', err => {
      log.debug('Socket Error: ' + err)
    })

    // subscribe to room
    socket.on('subscribe', (payload) => {
      try {
        channels.subscribe(socket, payload)
      } catch (err) {
        const error = errors.INVALID_REQUEST
        error.error = err.message
        socket.emit('Error', formatError(error))
        log.debug(err)
      }
    })

    // unsuscribe
    socket.on('unsubscribe', (payload) => {
      channels.unsubscribe(socket, payload)
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
          let result = await api.run(module, action, params)
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
                block: api.getLastBlock().number
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

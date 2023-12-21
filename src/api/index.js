import IO from 'socket.io'
import { Setup } from '../lib/Setup'
import Api from './Api'
import Status from './Status'
import TxPool from './TxPool'
import config from '../lib/config'
import UserEventsApi from './UserEventsApi'
import { HttpServer } from './HttpServer'
import { createChannels } from './channels'
import { errors, formatError, formatRes } from './lib/apiTools'
import { evaluateError } from './lib/evaluateError'
import Logger from '../lib/Logger'

const port = config.api.port || '3003'
const address = config.api.address || 'localhost'
const log = Logger('[explorer-api]', config.api.log)

Setup({ log })
  .start()
  .then(({ initConfig }) => {
    // data collectors
    const api = new Api({ initConfig, log }, config.api)
    const status = new Status({ log })
    const txPool = new TxPool({ log })
    api.start()
    status.start()
    txPool.start()

    let userEventsApi

    const delayedResult = (res, payload, socket) => {
      const { params, result, delayed } = res
      if (delayed && userEventsApi) {
        const registry = delayed.registry || (!result.data && delayed.runIfEmpty)
        if (payload.getDelayed) {
          const lastBlock = api.getLastBlock()
          const block = (lastBlock) ? lastBlock.number : null

          userEventsApi.send({
            action: delayed.action,
            module: delayed.module,
            params,
            socketId: socket ? socket.id : undefined,
            payload,
            block,
            result
          })
        }
        res.result.delayed = { fields: delayed.fields, registry }
      }
      return res
    }

    const send = ({ res, response, payload }) => {
      const { result } = delayedResult(response, payload)
      res.send(result)
    }

    // http server
    const { httpServer } = HttpServer({ api, status, log }, send)
    httpServer.listen(port, address)
    const io = new IO(httpServer)

    // start userEvents api
    if (config.api.allowUserEvents) {
      userEventsApi = UserEventsApi(io, api, { initConfig })
    }

    io.httpServer.on('listening', () => {
      log.info(`Server listening on: ${address || '0.0.0.0'}:${port}`)
    })

    // create channels
    const channels = createChannels(io)
    const { blocksChannel, statusChannel, txPoolChannel, statsChannel, txsChannel, balancesChannel } = channels.channels

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

    // send transactions on join
    txsChannel.on('join', socket => {
      socket.emit('data', formatRes({ action: 'newTransactions', result: api.getLastTransactions() }))
    })
    // send new blocks & transactions to channels
    api.events.on('newBlocks', result => {
      blocksChannel.emit('newBlocks', result)
      txsChannel.emit('newTransactions', api.getLastTransactions())
      balancesChannel.emit('balancesStatus', api.getBalancesStatus())
    })

    // send stats on join
    statsChannel.on('join', socket => {
      socket.emit('data', formatRes({ action: 'stats', result: api.getStats() }))
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

    // send balances status on join
    balancesChannel.on('join', socket => {
      socket.emit('data', formatRes({ action: 'balancesStatus', result: api.getBalancesStatus() }))
    })

    io.on('connection', socket => {
      socket.emit('open', { time: Date.now(), settings: api.info() })
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
        try {
          const res = await api.run(payload)
          const req = payload
          const { module, action, result } = delayedResult(res, payload, socket)
          socket.emit('data', formatRes({ module, action, result, req }))
        } catch (err) {
          log.debug(`Action: ${payload.action}: ERROR: ${err}`)
          log.trace(err)
          socket.emit('Error',
            formatRes({ result: null, req: payload, error: evaluateError(err) })
          )
        }
      })
    })
  })

process.on('unhandledRejection', err => {
  log.error(err)
})

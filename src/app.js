import IO from 'socket.io'
import config from './lib/config'
import dataSource from './lib/dataSource'
import Blocks from './lib/dataBlocks'
import Erc20 from './lib/dataErc20'
import * as errors from './lib/errors'
import Logger from './lib/Logger'

const port = config.server.port || '3000'
const log = Logger('explorer-api', config.api.log)

dataSource.then(db => {
  log.info('Database connected')
  const io = new IO(port)

  io.httpServer.on('listening', () => {
    log.info('Server listen on port ' + port)
  })

  // data collectors
  const erc20 = new Erc20(db)
  const blocks = new Blocks(db)
  blocks.start()
  erc20.start()

  blocks.events.on('newBlocks', data => {
    io.emit('data', formatRes('newBlocks', data))
  })

  blocks.events.on('block', data => {
    io.emit('data', formatRes('block', data))
  })

  erc20.events.on('newTokens', data => {
    io.emit('data', formatRes('tokens', data))
  })

  io.on('connection', socket => {
    io.emit('open', { time: Date.now(), settings: publicSettings() })
    io.emit('data', formatRes('newBlocks', blocks.getLastBlocks()))
    io.emit('data', formatRes('tokens', erc20.getTokens()))
    socket.on('message', () => { })
    socket.on('disconnect', () => { })
    socket.on('error', err => {
      log.error('Socket Error: ' + err)
    })

    socket.on('data', payload => {
      if (payload && payload.type) {
        let type = payload.type
        let action = payload.action
        let params = payload.options
        let collector = null

        switch (type) {
          case 'blocks':
            collector = blocks
            break
          case 'erc20':
            collector = erc20
            break
          default:
            io.emit('error', formatError(errors.INVALID_TYPE))
            break
        }
        if (collector) {
          let resAction = type + action
          collector
            .run(action, params)
            .then(result => {
              io.emit('data', formatRes(resAction, result, payload))
            })
            .catch(err => {
              log.debug('Collector: ' + type + ', Action: ' + action + ' ERROR: ' + err)
              io.emit(
                'error',
                formatRes(resAction, null, payload, errors.INVALID_REQUEST)
              )
            })
        }
      } else {
        io.emit('error', formatError(errors.INVALID_REQUEST))
      }
    })
  })
})




const publicSettings = () => {
  return config.publicSettings
}


const formatRes = (action, result, req, error) => {
  let data
  let pages
  let next
  let prev
  let parentData
  if (!result && !error) error = errors.EMPTY_RESULT
  if (error) {
    error = formatError(error)
  } else {
    data = result.DATA || null
    pages = result.PAGES || null
    next = result.NEXT || null
    prev = result.PREV || null
    parentData = result.PARENT_DATA || null
  }
  if (!data && !error) error = formatError(errors.EMPTY_RESULT)
  return { action, data, req, pages, error, prev, next, parentData }
}

const formatError = error => {
  let serverTime = Date.now()
  return { error, serverTime }
}

process.on('unhandledRejection', err => {
  log.error(err)
  // process.exit(1)
})

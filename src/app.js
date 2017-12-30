import IO from 'socket.io'
import config from './lib/config'
import dataSource from './lib/db'
import Blocks from './lib/dataBlocks'
import Erc20 from './lib/dataErc20'
import * as errors from './lib/errors'

const port = config.server.port || '3000'

dataSource.then(db => {
  console.log('Database connected')
  const io = new IO(port)

  io.httpServer.on('listening', () => {
    console.log('Server listen on port ' + port)
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
    io.emit('open', { time: Date.now() })
    io.emit('data', formatRes('newBlocks', blocks.getLastBlocks()))
    io.emit('data', formatRes('tokens', erc20.getTokens()))
    socket.on('message', () => {})
    socket.on('disconnect', () => {})
    socket.on('error', err => {
      console.log(err)
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
              console.log(err)
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

const formatRes = (action, result, req, error) => {
  let data
  let pages
  if (!result && !error) error = errors.EMPTY_RESULT
  if (error) {
    error = formatError(error)
  } else {
    data = result.DATA || null
    pages = result.PAGES || null
  }
  return { action, data, req, pages, error }
}

const formatError = error => {
  let serverTime = Date.now()
  return { error, serverTime }
}

process.on('unhandledRejection', err => {
  console.error(err)
  // process.exit(1)
})

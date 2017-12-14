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

  blocks.events.on('newBlocks', data => {
    io.emit('data', formatRes('newBlocks', data))
  })

  blocks.events.on('block', data => {
    console.log('newBlock', data)
    io.emit('data', formatRes('block', data))
  })

  io.on('connection', socket => {
    io.emit('open', { time: Date.now() })
    io.emit('data', formatRes('newBlocks', blocks.last))
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
          collector
            .run(action, params)
            .then(result => {
              io.emit('data', formatRes(type + action, result, payload))
            })
            .catch(err => {
              console.log(err)
              io.emit('error', formatError(errors.INVALID_REQUEST))
            })
        }
      } else {
        io.emit('error', formatError(errors.INVALID_REQUEST))
      }
    })
  })
})

const formatRes = (action, result, req) => {
  let data = result.DATA || result
  let pages = result.PAGES || null
  return { action, data, req, pages }
}

const formatError = error => {
  let serverTime = Date.now()
  return { error, serverTime }
}

process.on('unhandledRejection', err => {
  console.error(err)
  // process.exit(1)
})

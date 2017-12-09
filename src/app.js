import 'babel-polyfill'
import IO from 'socket.io'
import config from '../config.json'
import dataSource from './lib/db.js'
import Blocks from './lib/classBlocks.js'
import * as errors from './lib/errors.js'

const port = config.server.port || '3000'

dataSource.then(db => {
  console.log('Database connected')
  const io = new IO(port)

  io.httpServer.on('listening', () => {
    console.log('Server listen on port ' + port)
  })

  const blocks = new Blocks(db)

  blocks.events.on('newBlocks', data => {
    console.log('new', blocks.latest)
    io.emit('data', formatData('newBlocks', data))
  })

  io.on('connection', socket => {
    io.emit('open', { time: Date.now() })
    socket.on('message', () => {})
    socket.on('disconnect', () => {})
    socket.on('error', err => {
      console.log(err)
    })

    socket.on('data', payload => {
      if (payload && payload.type) {
        let type = payload.type
        switch (type) {
          case 'blocks':
            io.emit('data', formatData('blocks', blocks.last))
            break

          default:
            io.emit('error', formatError('INVALID_TYPE'))
            break
        }
      } else {
        io.emit('error', formatError('INVALID_REQUEST'))
      }

      /*       blocks.findOne({ number: 1 }, {}, (err, doc) => {
        console.log(err, doc)
      }) */
    })
  })
})

const formatData = (action, data) => {
  return { action, data }
}

const formatError = key => {
  let error = errors[key] || 'Unknown Error'
  let serverTime = Date.now()
  return { error, serverTime }
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

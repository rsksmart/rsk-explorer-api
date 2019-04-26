import io from 'socket.io-client'
import * as c from '../lib/cli'

const url = process.argv[2]
let channel = process.argv[3]

if (!url || !channel) help()

const socket = io.connect(url, { reconnect: true })

c.info(`Waiting for WS on ${url}`)

socket.on('connect', data => {
  c.ok('Connected! ✌')
  c.info(`subscribing to channel: ${channel}`)
  socket.emit('subscribe', { to: channel })
})

socket.on('subscription', data => {
  if (channel === data.channel) {
    c.info(`subscribed to channel: ${channel}`)
  }
})

socket.on('disconnect', socket => {
  c.warn('Disconnected ☹')
})

socket.on('data', async res => {
  try {
    console.log(res)
  } catch (err) {
    c.error(err)
    process.exit(9)
  }
})

socket.on('Error', err => {
  let error = err.error || ''
  c.error(`ERROR: ${error}`)
  c.warn(err)
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(9)
})

function help () {
  c.info(`Usage: ${process.argv[0]} ${process.argv[1]} [url] [channel]`)
  process.exit(0)
}

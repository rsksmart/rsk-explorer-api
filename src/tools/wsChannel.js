import io from 'socket.io-client'
import { log } from '@rsksmart/rsk-js-cli'

const url = process.argv[2]
let channel = process.argv[3]

if (!url || !channel) help()

const socket = io.connect(url, { reconnect: true })

log.info(`Waiting for WS on ${url}`)

socket.on('connect', data => {
  log.ok('Connected! ✌')
  log.info(`subscribing to channel: ${channel}`)
  socket.emit('subscribe', { to: channel })
})

socket.on('subscription', data => {
  if (channel === data.channel) {
    log.info(`subscribed to channel: ${channel}`)
  }
})

socket.on('disconnect', socket => {
  log.warn('Disconnected ☹')
})

socket.on('data', async res => {
  try {
    console.log(res)
  } catch (err) {
    log.error(err)
    process.exit(9)
  }
})

socket.on('Error', err => {
  let error = err.error || ''
  log.error(`ERROR: ${error}`)
  log.warn(err)
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(9)
})

function help () {
  log.info(`Usage: ${process.argv[0]} ${process.argv[1]} [url] [channel]`)
  process.exit(0)
}

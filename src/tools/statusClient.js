import io from 'socket.io-client'
import config from '../lib/config'
import { info, ok, warn, red, green, orange, reset, error } from '../lib/cli'
const url = process.env.URL || `ws://localhost:${config.server.port}`


const socket = io.connect(url, { reconnect: true })
info(`Waiting for: ${url}`)

socket.on('connect', socket => {
  ok('Connected! ✌')
})

socket.on('disconnect', socket => {
  warn('Disconnected ☹')
})

socket.on('data', data => {
  let action = data.action
  if (action === 'dbStatus' && data.data) {
    const status = data.data
    delete (status.missingSegments)
    console.clear()
    console.log()
    info(url)
    console.log()
    console.log(`   Api  ${(socket.connected) ? green : red} ● ${reset}`)
    console.log(`   Node ${(!status.nodeDown) ? green : red} ● ${reset}`)
    console.log(`   Db   ${(status.dbMissingBlocks > 0) ? red : (status.requestingBlocks > 5) ? orange : green} ● ${reset}`)
    console.log()
    console.dir(status, { colors: true })
    if (status.nodeDown) error('The node is down... ☹ ')
  }
})

socket.on('error', err => {
  error(err)
})

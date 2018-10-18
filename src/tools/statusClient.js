import io from 'socket.io-client'
import config from '../lib/config'
import { info, ok, warn, red, green, orange, reset, error } from '../lib/cli'
const url = process.env.URL || `ws://localhost:${config.server.port}`
const socket = io.connect(url, { reconnect: true })
let blocksPerSecond
let stats = { time: 0, blocks: 0 }

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
    const prevState = status.prevState
    if (prevState && prevState.dbTime) {
      stats.time += parseInt((status.dbTime - prevState.dbTime) / 1000)
      stats.blocks += status.dbBlocks - prevState.dbBlocks
      blocksPerSecond = (stats.blocks / stats.time).toFixed(1)
    }
    delete status.missingSegments
    delete status.prevState
    console.clear()
    console.log()
    info(url)
    console.log()
    console.log(`   Api  ${(socket.connected) ? green : red} ● ${reset}`)
    console.log(`   Node ${(!status.nodeDown) ? green : red} ● ${reset}`)
    console.log(`   Db   ${(status.dbMissingBlocks > 0) ? red : (status.requestingBlocks > 5) ? orange : green} ● ${reset}`)
    console.log()
    console.dir(status, { colors: true })
    if (blocksPerSecond) {
      let color = (blocksPerSecond < 10) ? red : (blocksPerSecond < 20) ? orange : green
      console.log()
      console.log(`${color} ${blocksPerSecond}${reset} B/s`)
      console.log(`${color} ${parseInt(blocksPerSecond * 3600)}${reset} B/h`)
    }
    if (status.nodeDown) error('The node is down... ☹ ')
  }
})

socket.on('error', err => {
  error(err)
})

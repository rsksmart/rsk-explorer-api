import io from 'socket.io-client'
import config from '../lib/config'
import { info, ok, warn, red, green, orange, blue, reset, error, progressBar } from '../lib/cli'

const url = process.env.URL || `ws://localhost:${config.api.port}`
const socket = io.connect(url, { reconnect: true })
let blocksPerSecond
let stats = { time: 0, blocks: 0 }
let mark = '●'

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
    let { dbMissingBlocks, nodeDown, requestingBlocks, dbHighBlock, dbBlocks } = status
    console.clear()
    console.log()
    info(url)
    console.log()
    console.log(`   Api  ${(socket.connected) ? green : red} ${mark} ${reset}`)
    console.log(`   Node ${(!nodeDown) ? green : red} ${mark} ${reset}`)
    console.log(`   Db   ${(dbMissingBlocks > 0) ? red : (requestingBlocks > 5) ? orange : green} ${mark} ${reset}`)
    console.log()
    console.dir(status, { colors: true })
    if (blocksPerSecond) {
      let color = (blocksPerSecond < 10) ? red : (blocksPerSecond < 20) ? orange : green
      let endTime = Math.floor(dbMissingBlocks / blocksPerSecond)
      let end = new Date(Date.now() + (endTime * 1000))
      console.log()
      console.log(`${color} ≈ ${blocksPerSecond} B/s${reset}`)
      console.log(`${color} ≈ ${parseInt(blocksPerSecond * 3600)} B/h${reset}`)
      console.log(`${blue} ≈ Remaining Time:${reset} ${Math.round(endTime / 3600)} H${reset}`)
      console.log(`${blue} ≈ End:${reset} ${end.toUTCString()}${reset}`)
    }
    if (nodeDown) error('The node is down... ☹ ')
    // show progress bar
    if (dbMissingBlocks > 1) {
      let bar = progressBar(dbHighBlock, dbBlocks, { steps: 30 })
      console.log()
      console.log(`  ${blue}${bar}${reset}`)
    }
  }
})

socket.on('error', err => {
  error(err)
})

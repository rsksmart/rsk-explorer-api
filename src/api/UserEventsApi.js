import path from 'path'
import { fork } from 'child_process'
import config from '../lib/config'
import { errors, formatRes, getModule } from './apiLib'

function UserEventsSocket () {
  return fork(path.resolve(__dirname, '../services/userEvents/userEventsService.js'))
}

export const UserEventsApi = (io, Blocks, log) => {
  if (!config.api.allowUserEvents) return
  log = log || console
  const userEvents = UserEventsSocket()

  userEvents.on('message', msg => {
    const socket = io.sockets.connected[msg.socketId]
    if (socket) {
      const payload = msg.payload
      const action = payload.action
      const module = msg.module
      processMsg(msg, Blocks)
        .then(res => {
          let result = res.data
          let req = payload
          let error = res.error
          socket.emit('data', formatRes({ module, action, result, req, error }))
        }).catch(err => {
          log.error(err)
        })
    } else {
      log.error(`Socket id: ${msg.socketId} not found`)
    }
  })
  return userEvents
}

async function processMsg (msg, Blocks) {
  let data, error
  if (!msg.error) {
    if (msg.data) {
      data = msg
    } else {
      let { module, action, params } = msg.payload
      module = getModule(module)
      data = await Blocks.run(module, action, params).then(result => {
        return result
      })
    }
  } else {
    error = errors[msg.error.code] || errors.INVALID_REQUEST
    data = msg.result
  }
  return { data, error }
}

export default UserEventsApi

import path from 'path'
import { fork } from 'child_process'
import config from '../lib/config'
import { errors, formatRes } from './apiLib'

function UserEventsSocket () {
  return fork(path.resolve(__dirname, '../services/userEvents.js'))
}

export const UserEventsApi = (io, blocks, log) => {
  if (!config.api.allowUserEvents) return
  log = log || console
  const userEvents = UserEventsSocket()

  userEvents.on('message', msg => {
    const socket = io.sockets.connected[msg.socketId]
    if (socket) {
      const payload = msg.payload
      const action = payload.action
      processMsg(action, msg, blocks)
        .then(res => {
          socket.emit('data', formatRes(action, res.data, payload, res.error))
        }).catch(err => {
          log.error(err)
        })
    } else {
      log.error(`Socket id: ${msg.socketId} not found`)
    }
  })
  return userEvents
}

async function processMsg (action, msg, blocks) {
  let data, error
  if (!msg.error) {
    if (msg.data) {
      data = msg
    } else {
      data = await blocks.run(action, msg.params).then(result => {
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

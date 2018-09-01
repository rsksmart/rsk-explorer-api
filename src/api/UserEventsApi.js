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
      let params, payload, error
      ({ params, payload, error } = msg)
      const action = payload.action
      if (!error) {
        if (msg.data) {
          socket.emit('data', formatRes(action, msg, payload))
        } else {
          blocks.run(action, params).then(result => {
            socket.emit('data', formatRes(action, result, payload))
          })
        }
      } else {
        socket.emit('data', formatRes(action, null, payload, errors.INVALID_REQUEST))
      }
    } else {
      log.error(`Socket id: ${msg.socketId} not found`)
    }
  })
  return userEvents
}

export default UserEventsApi

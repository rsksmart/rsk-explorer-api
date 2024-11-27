import path from 'path'
import { fork } from 'child_process'
import { errors, formatRes } from './lib/apiTools'
import Logger from '../lib/Logger'

function UserEventsService ({ initConfig }) {
  const userEventsServicePath = path.resolve(__dirname, '../services/userEvents/userEventsService.js')
  const params = [JSON.stringify(initConfig)]

  return fork(userEventsServicePath, params)
}

const log = Logger('[user-events-api]')

export const UserEventsApi = (io, api, { initConfig }) => {
  log.info('Online')

  log.info('Starting user events service...')
  const userEventsService = UserEventsService({ initConfig })

  userEventsService.on('message', async msg => {
    try {
      const { payload, module } = msg
      const action = payload.action
      const res = await processMsg(msg, api)
      let result = res.data
      let req = payload
      let error = res.error
      if (!msg.socketId) return
      const socket = io.sockets.connected[msg.socketId]
      log.trace(`Sending message to client ${module}.${action} error:${JSON.stringify(error)}`)
      if (socket) socket.emit('data', formatRes({ module, action, result, req, error }))
    } catch (err) {
      log.error(err)
      return Promise.reject(err)
    }
  })
  return Object.freeze(userEventsService)
}

async function processMsg (msg, api) {
  let data, error
  if (!msg.error) {
    if (msg.data) {
      data = msg
    } else {
      const { result } = await api.run(msg.payload)
      data = result
    }
  } else {
    error = errors[msg.error.code] || errors.INVALID_REQUEST
    data = msg.result
  }
  return { data, error }
}

export default UserEventsApi

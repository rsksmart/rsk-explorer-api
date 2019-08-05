import io from 'socket.io-client'
import { StoredConfig } from '../../lib/StoredConfig'
import { ObjectID } from 'mongodb'

// id to store solc versions list on Config collection
export const versionsId = '_contractVerifierVersions'

export function ContractVerifierModule (db, collections, { url }, { log }) {
  log = log || console
  const storedConfig = StoredConfig(db)
  const socket = io.connect(url, { reconnect: true })
  const collection = collections.ContractVerification
  let versions

  socket.on('connect', data => {
    // request solc list
    socket.emit('data', { action: 'versions' })
  })

  // server responses
  socket.on('data', async msg => {
    try {
      const { data, action, error, request } = msg
      switch (action) {
        case 'versions':
          versions = Object.assign({}, data)
          storedConfig.update(versionsId, versions, { create: true })
          break
        // verification result
        case 'verify':
          const result = (data) ? data.result : null
          let { _id } = request
          if (!_id) throw new Error(`Missing _id {$request}`)
          _id = ObjectID(_id)
          // Update verification
          const { bytecodeHash, resultBytecodeHash } = result
          const match = (bytecodeHash.length === 66) && (bytecodeHash === resultBytecodeHash)
          log.debug(`Updating verification ${_id}`)
          const res = await collection.updateOne({ _id }, { $set: { error, verification: result, match } })
          if (!res.result.ok) throw new Error(`Error updating verification ${_id}`)
          break
      }
    } catch (err) {
      log.error(err)
    }
  })

  const getVersions = (msg) => {
    const { payload } = msg
    const { module } = payload
    msg.module = module
    if (versions) msg.data = versions
    else msg.error = 'missing versions'
    return msg
  }

  const requestVerification = async msg => {
    try {
      const { payload, result } = msg
      const { data } = result
      const { module, action } = payload
      const { address } = data
      if (!address) throw new Error(`Missing address in verification`)
      let res = await collection.insertOne({ address, request: data, timestamp: Date.now() })
      const id = res.insertedId
      if (!id) throw new Error(`Error creating pending verification`)
      data._id = id
      socket.emit('data', { action, params: data })
      msg.module = module
      return msg
    } catch (err) {
      return Promise.reject(err)
    }
  }
  return Object.freeze({ getVersions, requestVerification })
}

export default ContractVerifierModule

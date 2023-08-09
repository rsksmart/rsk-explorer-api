import io from 'socket.io-client'
import { StoredConfig } from '../../lib/StoredConfig'
import { isAddress, keccak256, add0x } from '@rsksmart/rsk-utils'
import { contractVerificationRepository } from '../../repositories/contractVerification.repository'
import { verificationResultsRepository } from '../../repositories/verificationResults.repository'
import { dataSource } from '../../lib/dataSource'
// id to store solc versions list on Config collection
export const versionsId = '_contractVerifierVersions'

export async function ContractVerifierModule ({ url } = {}, { log } = {}) {
  await dataSource({ log, skipCheck: true })
  log = log || console
  const storedConfig = StoredConfig()
  const socket = io.connect(url, { reconnect: true })
  let versions

  socket.on('connect', data => {
    // request solc list
    log.debug(`Requesting solc versions list`)
    socket.emit('data', { action: 'versions' })
  })

  socket.on('error', err => {
    log.error(err)
  })

  // server responses
  socket.on('data', async msg => {
    try {
      const { data, action, error, request } = msg
      switch (action) {
        case 'versions':
          log.debug(`Updating solc versions list`)
          versions = Object.assign({}, data)
          // temporal solution to '.' in field names
          await storedConfig.update(versionsId, {}, { create: true })
          storedConfig.update(versionsId, versions).catch(err => {
            log.warn(err)
          })
          break
        // verification result
        case 'verify':
          const result = (data) ? data.result : null
          let { _id, address } = request
          if (!_id) throw new Error(`Missing _id {$request}`)
          // _id = ObjectID(_id)
          log.debug(`New verification received ${address}`)
          // Update verification
          const match = checkResult(result || {})
          log.debug(`Updating verification ${_id}`)
          const res = await contractVerificationRepository.updateOne({ _id }, { error, result, match })
          if (!res.result.ok) throw new Error(`Error updating verification ${_id}`)

          // store verification positive results
          if (match && !error) {
            log.debug(`Saving verification result ${address}`)
            const sources = extractUsedSourcesFromRequest(request, result)
            const { abi } = result
            const doc = { _id, address, match, request, result, abi, sources, timestamp: Date.now() }
            const inserted = await verificationResultsRepository.insertOne(doc)
            if (!inserted) throw new Error('Error inserting verification result')
            log.debug(`Verification result inserted. Contract address: ${address}, verification result ID: ${inserted._id}`)
          }
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
      // delete data._id
      const { _id } = data
      if (!address) throw new Error(`Missing address in verification`)
      let res = await contractVerificationRepository.insertOne({ _id, address, request: data, timestamp: Date.now() })
      const id = res._id
      if (!id || id !== _id) throw new Error(`Error creating pending verification`)
      data._id = id
      log.debug(`Sending verification to verifier ID:${id}`)
      if (!socket.connected) throw new Error('Cannot connect to contract verifier')
      socket.emit('data', { action, params: data })
      msg.module = module
      msg.data = { address, id }
      return msg
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const checkResult = ({ bytecodeHash, resultBytecodeHash }) => {
    try {
      if (!bytecodeHash || bytecodeHash.length !== 66) throw new Error('Invalid bytecodeHash')
      if (!resultBytecodeHash) throw new Error('resultBytecodeHash is empty')
      return resultBytecodeHash === bytecodeHash
    } catch (err) {
      log.debug(err)
      return false
    }
  }
  return Object.freeze({ getVersions, requestVerification })
}

export function replaceImport (content, name) {
  const re = new RegExp(`^import\\s*"([A-Za-z-0-9_\\/\\.]*(/${name}))";$`)
  return content.replace(re, function (a, b) {
    return a.replace(b, `./${name}`)
  })
}

export function extractUsedSourcesFromRequest ({ source, imports }, { usedSources }) {
  const sourceData = imports[0]
  // fix it with hash
  if (source === sourceData.contents) {
    sourceData.file = sourceData.name
    usedSources.unshift(sourceData)
  }
  // replaces paths in in imports
  imports = imports.map(i => {
    let { name, contents } = i
    usedSources.forEach(s => {
      let { file } = s
      contents = contents.split('\n').map(line => replaceImport(line, file)).join('\n')
    })
    return { contents, name }
  })

  return usedSources.map(s => {
    let { file: name } = s
    let imp = imports.find(i => i.name === name)
    const { contents } = imp
    return { name, contents }
  })
}

export function getVerificationId ({ address }) {
  if (!isAddress(address)) throw new Error(`Invalid address ${address}`)
  const timestamp = Date.now()
  return add0x(keccak256(`${address}${timestamp}`))
}

export default ContractVerifierModule

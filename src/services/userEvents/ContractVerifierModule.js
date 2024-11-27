import {isAddress, keccak256, add0x} from '@rsksmart/rsk-utils'
import {REPOSITORIES} from '../../repositories'
import {CONTRACT_VERIFIER_SOLC_VERSIONS_ID} from '../../lib/defaultConfig'
import axios from 'axios'
import Logger from '../../lib/Logger'
import config from '../../lib/config'
const log = Logger('[user-events-service]', config.blocks.log)

const {
  Config: configRepository,
  ContractVerification: contractVerificationRepository,
  VerificationResults: verificationResultsRepository
} = REPOSITORIES

export function ContractVerifierModule ({ url } = {}, { log } = {}) {
  log = log || console
  let versions
  log.debug(`Contract verifier module started`)
  const fetchSolcVersions = async () => {
    try {
      const response = await axios.get(`${url}/api/verifier/getSolcVersions`)
      const {data} = response
      versions = data
      await configRepository[CONTRACT_VERIFIER_SOLC_VERSIONS_ID].upsert(versions)
      log.debug('Solc versions updated successfully')
    } catch (err) {
      throw new Error(`Not able to load solc versions: ${err}`)
    }
  }
  // Load solc versions
  fetchSolcVersions()

  const getVersions = (msg) => {
    const {payload} = msg
    const {module} = payload
    msg.module = module
    if (versions) {
      msg.data = versions
    } else {
      msg.error = 'missing versions'
    }
    return msg
  }

  return Object.freeze({getVersions, requestVerification})
}

export function replaceImport (content, name) {
  const re = new RegExp(`^import\\s*"([A-Za-z-0-9_\\/\\.]*(/${name}))";$`)
  return content.replace(re, function (a, b) {
    return a.replace(b, `./${name}`)
  })
}

export function extractUsedSourcesFromRequest ({source, imports, sources, name}, {usedSources}) {
  if (!sources) { // solidity source file verification method
    const sourceData = imports[0]
    // fix it with hash
    if (source === sourceData.contents) {
      sourceData.file = sourceData.name
      usedSources.unshift(sourceData)
    }
    // replaces paths in in imports
    imports = imports.map(i => {
      let {name, contents} = i
      usedSources.forEach(s => {
        let {file} = s
        contents = contents.split('\n').map(line => replaceImport(line, file)).join('\n')
      })
      return {contents, name}
    })

    return usedSources.map(s => {
      let {file: name} = s
      let imp = imports.find(i => i.name === name)
      const {contents} = imp
      return {name, contents}
    })
  } else { // standard json input verification method
    const sourcesToSave = []
    usedSources.forEach(s => {
      const {file, path} = s

      const sourceFile = sources[path]
      const {content: contents} = sourceFile

      if (file.split('.')[0] === name) { // is the main contract
        sourcesToSave.unshift({name: file, contents})
      } else {
        sourcesToSave.push({name: file, contents})
      }
    })

    return sourcesToSave
  }
}

export function getVerificationId ({address}) {
  if (!isAddress(address)) throw new Error(`Invalid address ${address}`)
  const timestamp = Date.now()
  return add0x(keccak256(`${address}${timestamp}`))
}

export async function requestVerification (msg, url) {
  try {
    log.debug(`Requesting verification`)
    log.debug(`msg is`, msg)

    const {address, _id: id} = msg.request
    const data = msg.request
    if (!address) throw new Error(`Missing address in verification`)
    let res = await contractVerificationRepository.insertOne({id, address, request: data, timestamp: Date.now()})
    const resId = res.id
    if (!id || id !== resId) throw new Error(`Error creating pending verification`)
    data.id = resId
    log.debug(`Sending verification to verifier ID:${id}`)
    // msg.module = module
    msg.data = {address, id}
    log.debug('data sent is', data)
    log.debug('bytecode sent is', data.bytecode)

    const response = await axios.post(`${url}/api/verifier/verify`, data)

    log.debug('response is', response)
    log.debug(`response data is `, response.data)

    const match = checkResult(response.data)
    log.debug(`Updating verification ${id}`)
    const updated = await contractVerificationRepository.updateOne({id}, {result: response.data, match})
    if (!updated) throw new Error(`Error updating verification ${id}`)
    if (match) {
      const sources = extractUsedSourcesFromRequest(data, response.data)
      const {abi} = response.data
      const doc = {id, address, match, data, result: response.data, abi, sources, timestamp: Date.now()}
      const inserted = await verificationResultsRepository.insertOne(doc)
      if (!inserted) throw new Error('Error inserting verification result')
      log.debug(`Verification result inserted. Contract address: ${address}, verification result ID: ${inserted.id}`)
    }
    return msg
  } catch (error) {
    log.debug(`Error requesting verification: ${error}`)
  }
}

function checkResult ({bytecodeHash, resultBytecodeHash}) {
  try {
    if (!bytecodeHash || bytecodeHash.length !== 66) throw new Error('Invalid bytecodeHash')
    if (!resultBytecodeHash) throw new Error('resultBytecodeHash is empty')
    return resultBytecodeHash === bytecodeHash
  } catch (err) {
    log.debug(err)
    return false
  }
}

export default ContractVerifierModule

import { BigNumber } from 'bignumber.js'
import { BIG_NUMBER } from './types'
import { remove0x, toBuffer, isAddress } from '@rsksmart/rsk-utils'
import crypto from 'crypto'
import { configRepository, eventRepository, verificationResultsRepository } from '../repositories'
import { EXPLORER_INITIAL_CONFIG_ID } from './defaultConfig'
import nod3 from './nod3Connect'
import { ContractParser } from '@rsksmart/rsk-contract-parser'
export * from '@rsksmart/rsk-utils'

export function convertUnixTimestampToISO (unixTimestamp) {
  return new Date(unixTimestamp * 1000).toISOString()
}

export const bigNumberDoc = bigNumber => {
  return typeof bigNumber.toHexString !== 'undefined'
    ? bigNumber.toHexString()
    : '0x' + bigNumber.toString(16)
}

export const isBigNumber = value => {
  return isObj(value) && (
    (value._isBigNumber === true) ||
    (value.isBigNumber === true) ||
    (value instanceof BigNumber) ||
    (value.lte && value.toNumber))
}

export const serializeBigNumber = value => {
  return (isBigNumber(value)) ? bigNumberDoc(value) : value
}

export const isSerializedBigNumber = value => {
  return value.type && value.value && value.type === BIG_NUMBER
}

export const unSerializeBigNumber = value => {
  return (isSerializedBigNumber(value)) ? new BigNumber(value.value) : value
}

export const bigNumberToSring = bn => {
  if (bn.type && bn.type === BIG_NUMBER) return bn.value
  if (isBigNumber(bn)) return bn.toString()
  return bn
}

export const bigNumberSum = values => {
  let total = new BigNumber(0)
  values
    .forEach(value => {
      value = newBigNumber(value)
      total = total.plus(value)
    })
  return total
}

export const bigNumberDifference = (a, b) => {
  a = newBigNumber(a)
  b = newBigNumber(b)
  return a.minus(b)
}

export const newBigNumber = value => isBigNumber(value) ? value : new BigNumber(value)

export const isObj = (value) => {
  return !Array.isArray(value) && typeof value === 'object' && value !== null
}

export const serialize = (obj) => {
  if (typeof obj === 'undefined' || obj === null) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(o => serialize(o))
  if (isBigNumber(obj)) return serializeBigNumber(obj)
  let serialized = {}
  for (let p in obj) {
    let value = obj[p]
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        serialized[p] = value.map(v => serialize(v))
      } else {
        if (!isBigNumber(value)) serialized[p] = serialize(value)
        else serialized[p] = serializeBigNumber(value)
      }
    } else {
      serialized[p] = value
    }
  }
  return serialized
}

export const checkBlockHash = value => {
  value = String(value).toLowerCase()
  if (/^(0x)[0-9a-f]{64}$/.test(value)) return value
  if (/^[0-9a-f]{64}$/.test(value)) return '0x' + value
  return null
}

export const isBlockHash = value => checkBlockHash(value) !== null

export const blockQuery = (blockHashOrNumber) => {
  const hash = (isBlockHash(blockHashOrNumber)) ? blockHashOrNumber : null
  const number = parseInt(blockHashOrNumber)
  if (hash) return { hash }
  if (number || number === 0) return { number }
  return null
}

const blockTotalDiff = block => bigNumberToSring(block.totalDifficulty)

export const getBestBlock = blocks => {
  blocks.sort((a, b) => {
    let aDiff = blockTotalDiff(a)
    let bDiff = blockTotalDiff(b)
    if (aDiff > bDiff) return -1
    if (aDiff < bDiff) return 1
    return 0
  })
  return blocks[0]
}

export const applyDecimals = (value, decimals = 18) => {
  value = newBigNumber(value)
  const divisor = new BigNumber(10).exponentiatedBy(parseInt(decimals))
  const result = value.dividedBy(divisor)
  return result
}

export const isValidBlockNumber = number => parseInt(number) === number && number >= 0

export const isBlockObject = block => {
  if (typeof block !== 'object') return false
  const { hash, number, transactions, miner } = block
  if (!transactions) return false
  return isBlockHash(hash) && isAddress(miner) && isValidBlockNumber(number)
}

export const toAscii = hexString => toBuffer(remove0x(hexString), 'hex').toString('ascii').replace(/\0/g, '')

export const quantityMarks = (quantity, unit, mark = '*') => {
  quantity = parseInt(quantity)
  unit = parseInt(unit)
  if (isNaN(quantity) || isNaN(unit)) return ''
  let steps = Math.floor(quantity / unit)
  return Array(++steps).join(mark)
}

export const chunkArray = (arr, chunkSize) => {
  const result = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    let chunk = arr.slice(i, i + chunkSize)
    result.push(chunk)
  }
  return result
}

export const hash = (thing, alg = 'sha1', out = 'hex') => {
  return crypto.createHash(alg).update(JSON.stringify(thing)).digest(out)
}

export const createHash = (v) => hash(v, 'sha1', 'hex')

const enableAllMeasuresLogging = false

export const measurePromiseTime = async (promise, { name = 'Measurement', forceMeasureLogging = false, ...extraData } = {}) => {
  const startTime = Date.now()
  const result = await promise
  const endTime = Date.now()
  const durationMs = endTime - startTime

  if (enableAllMeasuresLogging || forceMeasureLogging) console.dir({ [name]: `${durationMs}ms`, ...extraData }, { depth: null })

  return {
    name,
    result,
    startTime,
    endTime,
    durationMs,
    extraData
  }
}

export async function updateUndecodedContractEvents ({ contractAddress, log = console }) {
  // remove log.dir workaround later (bunyan logger doesn't support dir property)
  if (!log.dir) log.dir = console.dir
  log.dir({ test: 'test' }, { depth: null })

  if (!contractAddress || !isAddress(contractAddress)) {
    throw new Error('Invalid contract address')
  }

  // get undecoded events
  const undecodedEvents = await eventRepository.find({
    address: contractAddress,
    event: null
  },
  undefined,
  undefined,
  undefined,
  {}
  )

  log.dir({
    result: {
      count: undecodedEvents.length,
      undecodedEvents
    }
  }, { depth: null })

  if (undecodedEvents.length === 0) {
    log.info('No undecoded events found')
    return
  }

  // get contract details
  const initConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
  log.dir({ parserInitConfig: initConfig }, { depth: null })
  const parser = new ContractParser({ nod3, initConfig })
  const contractDetails = await parser.getContractDetails(contractAddress)

  log.dir({ contractDetails }, { depth: null })

  // fetch abi
  let abi = null
  if (contractDetails.isProxy) {
    log.info('Contract is a proxy. Fetching implementation ABI...')

    if (!contractDetails.implementationAddress) {
      log.error(`No implementation address provided. Unable to decode events from contract ${contractAddress}`)
      process.exit(1)
    }

    const verification = await verificationResultsRepository.findOne({
      address: contractDetails.implementationAddress,
      match: true
    })

    log.info('Implementation ABI found')
    if (verification) abi = verification.abi
  } else {
    log.info('Contract is not a proxy. Fetching contract ABI...')
    const verification = await verificationResultsRepository.findOne({
      address: contractAddress,
      match: true
    })

    log.info('Contract ABI found')
    if (verification) abi = verification.abi
  }

  log.dir({ abiLength: abi.length, abi }, { depth: null })

  if (!abi) {
    log.error(`No ABI found for contract ${contractAddress}`)
    process.exit(1)
  }

  // attempt to decode events
  parser.setAbi(abi)

  const decodedEvents = parser.parseTxLogs(undecodedEvents)

  log.dir({
    decodingResult: {
      count: decodedEvents.length,
      decodedEvents
    }
  }, { depth: null })

  // remove old events
  const deletionResult = await eventRepository.deleteMany({
    eventId: {
      in: decodedEvents.map(event => event.eventId)
    }
  })

  log.info({ deletionResult })

  // store decoded events
  for (const decodedEvent of decodedEvents) {
    const storedEvent = await eventRepository.insertOne(decodedEvent)
    log.dir({ storedEvent }, { depth: null })
  }

  log.info('Done')
}

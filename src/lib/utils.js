import { BigNumber } from 'bignumber.js'
import { BIG_NUMBER } from './types'
import { ObjectID } from 'mongodb'
import keccak from 'keccak'

export const isHexString = str => {
  str = (str.substring(0, 2) === '0x') ? str.substring(2) : str
  return /^[0-9a-f]+$/i.test(str)
}

export const add0x = str => (isHexString(str) && str.substring(0, 2) !== '0x') ? `0x${str}` : str

export const remove0x = str => (isHexString(str) && str.substring(0, 2) === '0x') ? str.substr(2, str.length) : str

export const isAddress = address => {
  return /^(0x)?[0-9a-f]{40}$/i.test(address)
}

export const isValidAddress = address => {
  throw new Error('Not impemented')
}

export const bigNumberDoc = bigNumber => {
  return '0x' + bigNumber.toString(16)
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
      value = isBigNumber(value) ? value : new BigNumber(value)
      total = total.plus(value)
    })
  return total
}

const isObj = (value) => {
  if (undefined === value || value === null) return false
  let is = (typeof value === 'object')
  is = (is) ? (value instanceof Array === false) : is
  return is
}

export const serialize = (obj) => {
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(o => serialize(o))
  if (isBigNumber(obj)) return serializeBigNumber(obj)
  if (obj instanceof ObjectID) return obj.toString()
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

export const arrayIntersection = (a, b) => a.filter(v => b.includes(v))

export const arrayDifference = (a, b) => a.filter(x => !b.includes(x))

export const arraySymmetricDifference = (a, b) => arrayDifference(a, b).concat(b.filter(x => !a.includes(x)))

export const hasValue = (arr, search) => arrayIntersection(arr, search).length > 0

export const includesAll = (arr, search) => !search.map(t => arr.indexOf(t)).filter(i => i < 0).length

export const atob = str => Buffer.from(str, 'base64').toString('binary')

export const btoa = base64 => Buffer.from(base64, 'binary').toString('base64')

export const base64toHex = (base64) => {
  let raw = atob(base64)
  return '0x' + [...new Array(raw.length)].map((c, i) => {
    let h = raw.charCodeAt(i).toString(16)
    return (h.length === 2) ? h : `0${h}`
  }).join('').toLowerCase()
}

export const keccak256 = (input, format = 'hex') => keccak('keccak256').update(input).digest(format)

export const jsonEncode = value => btoa(JSON.stringify(value))

export const jsonDecode = value => JSON.parse(atob(value))

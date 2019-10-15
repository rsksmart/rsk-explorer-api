import crypto from 'crypto'
import * as bs58 from 'bs58'
import { remove0x, add0x, keccak256 } from './utils'
import secp256k1 from 'secp256k1'
const PREFIXES = {
  mainnet: {
    pubKeyHash: '00',
    scriptHash: '05'
  },
  testnet: {
    pubKeyHash: '6F',
    scriptHash: 'C4'
  }
}
const getNetPrefix = netName => {
  let prefixes = PREFIXES[netName]
  if (!prefixes) throw new Error(`Unknown network ${netName}`)
  return prefixes
}

const createHash = (a, val, from = 'hex', to = 'hex') => crypto.createHash(a).update(val, from).digest(to)

export const sha256 = (val, from, to) => createHash('sha256', remove0x(val), from, to)

export const h160 = (val, from, to) => createHash('ripemd160', remove0x(val), from, to)

export const h160toAddress = (hash160, { netWork, prefixKey }) => {
  netWork = netWork || 'mainnet'
  prefixKey = prefixKey || 'pubKeyHash'
  const prefix = getNetPrefix(netWork)[prefixKey]
  hash160 = (Buffer.isBuffer(hash160)) ? hash160.toString('hex') : remove0x(hash160)
  hash160 = `${prefix}${hash160}`
  let check = sha256(sha256(hash160)).slice(0, 8)
  return bs58.encode(Buffer.from(`${hash160}${check}`, 'hex'))
}

export const pubToAddress = (pub, netWork) => {
  return h160toAddress(h160(sha256(remove0x(pub))), { netWork })
}

export const parsePublic = (pub, compressed) => {
  pub = (!Buffer.isBuffer(pub)) ? Buffer.from(remove0x(pub), 'hex') : pub
  return secp256k1.publicKeyConvert(pub, compressed)
}

export const decompressPublic = compressed => parsePublic(compressed, false).toString('hex')

export const compressPublic = pub => parsePublic(pub, true).toString('hex')

export const rskAddressFromBtcPublicKey = cpk => add0x(keccak256(parsePublic(cpk, false).slice(1)).slice(-40))

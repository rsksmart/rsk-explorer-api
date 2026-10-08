import { nod3Instance } from './nod3Connect'

export const REVERT_ERROR_CODE = -32015
export const TOKEN_READ_SELECTORS = ['0x06fdde03', '0x95d89b41', '0x313ce567', '0x18160ddd']
export const REQUEST_TIMEOUT_MS = 60000

const emptyStats = () => ({ calls: 0, reverts: 0, nodeErrors: 0, tokenReadErrors: 0, lastNodeError: null })

const describeRejection = error => typeof error === 'string' ? error : String(error && error.message)

const isTokenRead = ({ method, params = [] }) => method === 'eth_call' && !!params[0] &&
  typeof params[0].data === 'string' && TOKEN_READ_SELECTORS.includes(params[0].data.slice(0, 10).toLowerCase())

function withTimeout (promise, ms) {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`node request timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export function countNodeCalls (nod3, { requestTimeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const { rpc } = nod3
  const send = rpc.send.bind(rpc)
  let stats = emptyStats()

  rpc.send = async payload => {
    const payloads = Array.isArray(payload) ? payload : [payload]
    stats.calls += payloads.length
    try {
      return await withTimeout(send(payload), requestTimeoutMs)
    } catch (error) {
      if (error && error.errorCode === REVERT_ERROR_CODE) {
        stats.reverts += payloads.length
      } else {
        stats.nodeErrors += payloads.length
        stats.tokenReadErrors += payloads.filter(isTokenRead).length
        stats.lastNodeError = describeRejection(error)
      }
      throw error
    }
  }

  return {
    nod3,
    takeStats () {
      const taken = stats
      stats = emptyStats()
      return taken
    }
  }
}

export const createCountedNod3 = (source, options) => countNodeCalls(nod3Instance(source), options)

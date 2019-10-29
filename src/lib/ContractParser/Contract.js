import { toBuffer, add0x } from '../utils'
import ethAbi from 'ethereumjs-abi'

export default function Contract (abi, { address, nod3 } = {}) {
  if (!abi || typeof abi !== 'object') throw new Error('Invalid abi')

  const at = newAddress => {
    address = newAddress
  }

  const setNod3 = nod3Instance => {
    nod3 = nod3Instance
  }

  const abiFind = (type, name) => abi.find(i => i.type === type && i.name === name)

  const isMethod = name => abiFind('function', name)

  // const isEvent = name => abiFind('event', name)

  const getMethod = (methodName) => {
    const abiDef = isMethod(methodName)
    if (!abiDef) throw new Error(`Unknown method: "${methodName}"`)
    const { name, inputs, outputs } = abiDef
    const types = inputs.filter(i => i.type).map(i => i.type)
    const returns = outputs.filter(o => o.type).map(o => o.type)
    const id = ethAbi.methodID(name, types).toString('hex')
    const method = `${name}(${types.join(' ')})`
    return { types, id, name, method, returns }
  }

  const encodeCall = (methodName, params = []) => {
    try {
      const { id, types } = getMethod(methodName)
      let data = ethAbi.rawEncode(types, params).toString('hex')
      data = add0x(`${id}${data}`)
      return data
    } catch (err) {
      throw err
    }
  }

  const decodeCall = (methodName, data) => {
    const { returns } = getMethod(methodName)
    const decoded = ethAbi.rawDecode(returns, toBuffer(data))
    return (Array.isArray(decoded) && returns.length < 2) ? decoded[0] : decoded
  }

  const call = async (methodName, params = [], txData = {}) => {
    try {
      if (!nod3) throw new Error(`Set nod3 instance before call`)
      if (!address) throw new Error(`The contract address is not defined`)
      if (!Array.isArray(params)) throw new Error(`Params must be an array`)
      const data = encodeCall(methodName, params)
      const to = address
      const tx = Object.assign(txData, { to, data })
      const result = await nod3.eth.call(tx)
      return decodeCall(methodName, result)
    } catch (err) {
      return Promise.reject(err)
    }
  }
  return Object.freeze({ at, setNod3, encodeCall, decodeCall, call })
}

import { keccak256, add0x } from '../utils'

export const ABI_SIGNATURE = '__signatureData'

export const INTERFACE_ID_BYTES = 4

export const setAbi = abi => addSignatureDataToAbi(abi, true)

export const abiEvents = abi => abi.filter(v => v.type === 'event')

export const abiMethods = abi => abi.filter(v => v.type === 'function')

export const soliditySignature = name => keccak256(name)

export const soliditySelector = signature => signature.slice(0, 8)

export const solidityName = abi => {
  let { name, inputs } = abi
  inputs = (inputs) ? inputs.map(i => i.type) : []
  return (name) ? `${name}(${inputs.join(',')})` : null
}

export const removeAbiSignatureData = (abi) => {
  if (undefined !== abi[ABI_SIGNATURE]) delete abi[ABI_SIGNATURE]
  return abi
}

export const getInputsIndexes = abi => {
  let { inputs } = abi
  return (inputs && abi.type === 'event') ? inputs.map(i => i.indexed) : null
}

export const abiSignatureData = abi => {
  let method = solidityName(abi)
  let signature = (method) ? soliditySignature(method) : null
  let index = getInputsIndexes(abi)
  let indexed = (index) ? index.filter(i => i === true).length : 0
  return { method, signature, index, indexed }
}

export const addSignatureDataToAbi = (abi, skip) => {
  abi.map((value, i) => {
    if (!value[ABI_SIGNATURE] || !skip) {
      value[ABI_SIGNATURE] = abiSignatureData(value)
    }
  })
  return abi
}

export const erc165Id = selectors => {
  let id = selectors.map(s => Buffer.from(s, 'hex'))
    .reduce((a, bytes) => {
      for (let i = 0; i < INTERFACE_ID_BYTES; i++) {
        a[i] = a[i] ^ bytes[i]
      }
      return a
    }, Buffer.alloc(INTERFACE_ID_BYTES))
  return add0x(id.toString('hex'))
}

export const erc165IdFromMethods = methods => {
  return erc165Id(methods.map(m => soliditySelector(soliditySignature(m))))
}

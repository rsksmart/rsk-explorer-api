import * as rlp from 'rlp'

export const decodeAddress = address => {
  return '0x' + address.slice(-40)
}

export const decodeEventName = name => {
  name = (name.slice(0, 2) === '0x') ? name.slice(2, name.length) : name
  return Buffer.from(name, 'hex').toString('ascii').replace(/\0/g, '')
}

export const decodeData = data => {
  return rlp.decode(data).map(d => '0x' + d.toString('hex').replace(/^0+/, ''))
}

export const fakeAbi = Object.freeze([
  { // Remasc events
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'to',
        type: 'address'
      },
      {
        indexed: false,
        name: 'blockHash',
        type: ''
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'mining_fee_topic',
    type: 'event'
  }
])

export const getEventAbi = eventName => fakeAbi.find(a => a.name === eventName && a.type === 'event')

export const decodeByType = (type, value) => {
  if (type === 'address') return decodeAddress(value)
  return value
}

export const decodeLog = log => {
  let topics = [...log.topics]
  let event = decodeEventName(topics.shift())
  let abi = getEventAbi(event)
  if (event && abi) {
    log.event = event
    log.abi = abi
    log.args = []
    let decodedData = decodeData(log.data)
    for (let i in abi.inputs) {
      let input = abi.inputs[i]
      let { type, indexed } = input
      let decoded = (indexed === true) ? decodeByType(type, topics[i]) : decodedData[i - topics.length]
      if (decoded) log.args.push(decoded)
    }
  }
  return log
}

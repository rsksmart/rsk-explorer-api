import ethAbi from 'ethereumjs-abi'
import { remove0x, toBuffer, add0x } from '../utils'
import { ABI_SIGNATURE, addSignatureDataToAbi, removeAbiSignatureData } from './lib'

function EventDecoder (abi) {

  abi = addSignatureDataToAbi(abi)

  const formatDecoded = decoded => add0x(decoded.toString(16))

  const getEventName = topics => {
    const sigHash = remove0x(topics.shift())
    let events = abi.filter(i => {
      let { indexed, signature } = i[ABI_SIGNATURE]
      return signature === sigHash && indexed === topics.length
    })
    if (events.length > 1) throw new Error('Duplicate events in ABI')
    const eventABI = events[0]
    return { eventABI, topics }
  }

  const decodeElement = (data, types) => formatDecoded(ethAbi.rawDecode(types, toBuffer(data)))

  const decodeData = (data, types) => {
    let decoded = ethAbi.rawDecode(types, toBuffer(data))
    return decoded.map(d => formatDecoded(d))
  }
  const decodeLog = log => {
    const { eventABI, topics } = getEventName(log.topics)
    if (!eventABI) return log
    const event = eventABI.name
    let args = topics.map((topic, index) => decodeElement(topic, [eventABI.inputs[index].type]))
    const dataDecoded = decodeData(log.data, eventABI.inputs.filter(i => i.indexed === false).map(i => i.type))
    args = args.concat(dataDecoded)
    return { event, args, abi: eventABI }
  }
  return Object.freeze({ decodeLog })
}

export default EventDecoder

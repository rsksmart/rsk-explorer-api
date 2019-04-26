
import Channel from './lib/Channel'

export const CHANNELS = {
  blocksChannel: 'blocks',
  statusChannel: 'status',
  txPoolChannel: 'txpool',
  statsChannel: 'stats'
}

export const createChannels = io => {
  const channels = {}
  Object.keys(CHANNELS).forEach(channel => {
    const name = CHANNELS[channel]
    channels[channel] = Channel(name, io)
  })

  const getChannel = name => {
    const channelName = Object.keys(CHANNELS).find(ch => channels[ch].name === name)
    const channel = channels[channelName]
    if (!channel) throw new Error(`Unknow channel name: ${JSON.stringify(name)}`)
    return channel
  }

  const subscribe = (socket, { to }) => {
    const channel = getChannel(to)
    return channel.join(socket)
  }

  const unsubscribe = (socket, { to }) => {
    const channel = getChannel(to)
    return channel.leave(socket)
  }

  return Object.freeze({ channels, subscribe, unsubscribe })
}

export default createChannels

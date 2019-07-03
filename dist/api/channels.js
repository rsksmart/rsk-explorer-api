'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.createChannels = exports.CHANNELS = undefined;
var _Channel = require('./lib/Channel');var _Channel2 = _interopRequireDefault(_Channel);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const CHANNELS = exports.CHANNELS = {
  blocksChannel: 'blocks',
  statusChannel: 'status',
  txPoolChannel: 'txpool',
  statsChannel: 'stats' };


const createChannels = exports.createChannels = io => {
  const channels = {};
  Object.keys(CHANNELS).forEach(channel => {
    const name = CHANNELS[channel];
    channels[channel] = (0, _Channel2.default)(name, io);
  });

  const getChannel = name => {
    const channelName = Object.keys(CHANNELS).find(ch => channels[ch].name === name);
    const channel = channels[channelName];
    if (!channel) throw new Error(`Unknow channel name: ${JSON.stringify(name)}`);
    return channel;
  };

  const subscribe = (socket, { to }) => {
    const channel = getChannel(to);
    return channel.join(socket);
  };

  const unsubscribe = (socket, { to }) => {
    const channel = getChannel(to);
    return channel.leave(socket);
  };

  return Object.freeze({ channels, subscribe, unsubscribe });
};exports.default =

createChannels;
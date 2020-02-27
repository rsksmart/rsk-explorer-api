"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.createChannels = exports.CHANNELS = void 0;
var _Channel = _interopRequireDefault(require("./lib/Channel"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const CHANNELS = {
  blocksChannel: 'blocks',
  txsChannel: 'transactions',
  statusChannel: 'status',
  txPoolChannel: 'txpool',
  statsChannel: 'stats' };exports.CHANNELS = CHANNELS;


const createChannels = io => {
  const channels = {};
  Object.keys(CHANNELS).forEach(channel => {
    const name = CHANNELS[channel];
    channels[channel] = (0, _Channel.default)(name, io);
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
};exports.createChannels = createChannels;var _default =

createChannels;exports.default = _default;
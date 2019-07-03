'use strict';var _socket = require('socket.io');var _socket2 = _interopRequireDefault(_socket);
var _dataSource = require('../lib/dataSource');var _dataSource2 = _interopRequireDefault(_dataSource);
var _Api = require('./Api');var _Api2 = _interopRequireDefault(_Api);
var _Status = require('./Status');var _Status2 = _interopRequireDefault(_Status);
var _TxPool = require('./TxPool');var _TxPool2 = _interopRequireDefault(_TxPool);
var _log = require('./lib/log');var _log2 = _interopRequireDefault(_log);
var _UserEventsApi = require('./UserEventsApi');var _UserEventsApi2 = _interopRequireDefault(_UserEventsApi);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _HttpServer = require('./HttpServer');
var _channels = require('./channels');

var _apiTools = require('./lib/apiTools');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}






const port = _config2.default.api.port || '3003';
const address = _config2.default.api.address || 'localhost';

_dataSource2.default.then(db => {
  _log2.default.info('Database connected');

  // data collectors
  const api = new _Api2.default(db);
  const status = new _Status2.default(db);
  const txPool = new _TxPool2.default(db);
  api.start();
  status.start();
  txPool.start();

  // http server
  const httpServer = (0, _HttpServer.HttpServer)({ api, status, log: _log2.default });
  httpServer.listen(port, address);
  const io = new _socket2.default(httpServer);

  // start userEvents api
  const userEvents = (0, _UserEventsApi2.default)(io, api, { log: _log2.default });

  io.httpServer.on('listening', () => {
    _log2.default.info(`Server listening on: ${address || '0.0.0.0'}:${port}`);
  });

  // create channels
  const channels = (0, _channels.createChannels)(io);
  const { blocksChannel, statusChannel, txPoolChannel, statsChannel } = channels.channels;

  // send blocks on join
  blocksChannel.on('join', socket => {
    socket.emit('data', (0, _apiTools.formatRes)({ action: 'newBlocks', result: api.getLastBlocks() }));
  });

  // send status on join
  statusChannel.on('join', socket => {
    socket.emit('data', (0, _apiTools.formatRes)({ action: 'dbStatus', result: status.getState() }));
  });

  // send txPool & txPoolChart on join
  txPoolChannel.on('join', socket => {
    socket.emit('data', (0, _apiTools.formatRes)({ action: 'txPool', result: txPool.getState() }));
    socket.emit('data', (0, _apiTools.formatRes)({ action: 'txPoolChart', result: txPool.getPoolChart() }));
  });

  // send new blocks to channel
  api.events.on('newBlocks', result => {
    blocksChannel.emit('newBlocks', result);
  });

  // send status to channel
  status.events.on('newStatus', result => {
    statusChannel.emit('dbStatus', result);
  });

  // send txPool to channel
  txPool.events.on('newPool', result => {
    txPoolChannel.emit('txPool', result);
  });

  // send txPool chart to channel
  txPool.events.on('poolChart', result => {
    txPoolChannel.emit('txPoolChart', result);
  });

  // send stats to channel
  api.events.on('newStats', result => {
    statsChannel.emit('stats', result);
  });

  io.on('connection', socket => {
    socket.emit('open', { time: Date.now(), settings: (0, _apiTools.publicSettings)() });
    socket.on('message', () => {});
    socket.on('disconnect', () => {});
    socket.on('error', err => {
      _log2.default.debug('Socket Error: ' + err);
    });

    // subscribe to room
    socket.on('subscribe', payload => {
      try {
        channels.subscribe(socket, payload);
      } catch (err) {
        const error = _apiTools.errors.INVALID_REQUEST;
        error.error = err.message;
        socket.emit('Error', (0, _apiTools.formatError)(error));
        _log2.default.debug(err);
      }
    });

    // unsuscribe
    socket.on('unsubscribe', payload => {
      channels.unsubscribe(socket, payload);
    });

    // data handler
    socket.on('data', async payload => {
      try {
        const { module, action, params, result, delayed } = await api.run(payload);
        if (delayed && userEvents) {
          const registry = !result.data && delayed.runIfEmpty;
          if (payload.getDelayed) {
            userEvents.send({
              action: delayed.action,
              module: delayed.module,
              params,
              socketId: socket.id,
              payload,
              block: api.getLastBlock().number });

          }
          result.delayed = { fields: delayed.fields, registry };
        }
        socket.emit('data', (0, _apiTools.formatRes)({ module, action, result, req: payload }));
      } catch (err) {
        _log2.default.debug(`Action: ${payload.action}: ERROR: ${err}`);
        socket.emit('Error',
        (0, _apiTools.formatRes)({ result: null, req: payload, error: _apiTools.errors.INVALID_REQUEST }));

      }
    });
  });
});

process.on('unhandledRejection', err => {
  _log2.default.error(err);
  // process.exit(1)
});
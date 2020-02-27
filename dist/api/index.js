"use strict";var _socket = _interopRequireDefault(require("socket.io"));
var _dataSource = require("../lib/dataSource");
var _Api = _interopRequireDefault(require("./Api"));
var _Status = _interopRequireDefault(require("./Status"));
var _TxPool = _interopRequireDefault(require("./TxPool"));
var _log = _interopRequireDefault(require("./lib/log"));
var _UserEventsApi = _interopRequireDefault(require("./UserEventsApi"));
var _config = _interopRequireDefault(require("../lib/config"));
var _HttpServer = require("./HttpServer");
var _channels = require("./channels");
var _apiTools = require("./lib/apiTools");
var _evaluateError = require("./lib/evaluateError");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const port = _config.default.api.port || '3003';
const address = _config.default.api.address || 'localhost';

(0, _dataSource.setup)({ log: _log.default, skipCheck: true }).then(({ db, initConfig }) => {
  _log.default.info('Database connected');

  // data collectors
  const api = new _Api.default({ db, initConfig }, _config.default.api);
  const status = new _Status.default(db);
  const txPool = new _TxPool.default(db);
  api.start();
  status.start();
  txPool.start();

  // http server
  const httpServer = (0, _HttpServer.HttpServer)({ api, status, log: _log.default });
  httpServer.listen(port, address);
  const io = new _socket.default(httpServer);

  // start userEvents api
  const userEvents = (0, _UserEventsApi.default)(io, api, { log: _log.default });

  io.httpServer.on('listening', () => {
    _log.default.info(`Server listening on: ${address || '0.0.0.0'}:${port}`);
  });

  // create channels
  const channels = (0, _channels.createChannels)(io);
  const { blocksChannel, statusChannel, txPoolChannel, statsChannel, txsChannel } = channels.channels;

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

  // send transactions on join
  txsChannel.on('join', socket => {
    socket.emit('data', (0, _apiTools.formatRes)({ action: 'newTransactions', result: api.getLastTransactions() }));
  });
  // send new blocks & transactions to channels
  api.events.on('newBlocks', result => {
    blocksChannel.emit('newBlocks', result);
    txsChannel.emit('newTransactions', api.getLastTransactions());
  });

  // send stats on join
  statsChannel.on('join', socket => {
    socket.emit('data', (0, _apiTools.formatRes)({ action: 'stats', result: api.getStats() }));
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
    socket.emit('open', { time: Date.now(), settings: api.info() });
    socket.on('message', () => {});
    socket.on('disconnect', () => {});
    socket.on('error', err => {
      _log.default.debug('Socket Error: ' + err);
    });

    // subscribe to room
    socket.on('subscribe', payload => {
      try {
        channels.subscribe(socket, payload);
      } catch (err) {
        const error = _apiTools.errors.INVALID_REQUEST;
        error.error = err.message;
        socket.emit('Error', (0, _apiTools.formatError)(error));
        _log.default.debug(err);
      }
    });

    // unsuscribe
    socket.on('unsubscribe', payload => {
      channels.unsubscribe(socket, payload);
    });

    // data handler
    socket.on('data', async payload => {
      try {
        const res = await api.run(payload);
        const { module, action, params, result, delayed } = res;
        if (delayed && userEvents) {
          const registry = delayed.registry || !result.data && delayed.runIfEmpty;
          if (payload.getDelayed) {
            const lastBlock = api.getLastBlock();
            const block = lastBlock ? lastBlock.number : null;
            userEvents.send({
              action: delayed.action,
              module: delayed.module,
              params,
              socketId: socket.id,
              payload,
              block,
              result });

          }
          result.delayed = { fields: delayed.fields, registry };
        }
        socket.emit('data', (0, _apiTools.formatRes)({ module, action, result, req: payload }));
      } catch (err) {
        _log.default.debug(`Action: ${payload.action}: ERROR: ${err}`);
        _log.default.trace(err);
        socket.emit('Error',
        (0, _apiTools.formatRes)({ result: null, req: payload, error: (0, _evaluateError.evaluateError)(err) }));

      }
    });
  });
});

process.on('unhandledRejection', err => {
  _log.default.error(err);
  // process.exit(1)
});
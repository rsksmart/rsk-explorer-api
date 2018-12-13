'use strict';var _socket = require('socket.io');var _socket2 = _interopRequireDefault(_socket);
var _dataSource = require('../lib/dataSource');var _dataSource2 = _interopRequireDefault(_dataSource);
var _Blocks = require('./Blocks');var _Blocks2 = _interopRequireDefault(_Blocks);
var _Status = require('./Status');var _Status2 = _interopRequireDefault(_Status);
var _TxPool = require('./TxPool');var _TxPool2 = _interopRequireDefault(_TxPool);
var _Logger = require('../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);
var _http = require('http');var _http2 = _interopRequireDefault(_http);
var _UserEventsApi = require('./UserEventsApi');var _UserEventsApi2 = _interopRequireDefault(_UserEventsApi);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _apiLib = require('./apiLib');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}









const port = _config2.default.api.port || '3003';
const address = _config2.default.api.address || 'localhost';
console.log(address, port);
const log = (0, _Logger2.default)('explorer-api', _config2.default.api.log);

_dataSource2.default.then(db => {
  log.info('Database connected');

  // data collectors
  const blocks = new _Blocks2.default(db);
  const status = new _Status2.default(db);
  const txPool = new _TxPool2.default(db);
  blocks.start();
  status.start();
  txPool.start();

  const httpServer = _http2.default.createServer((req, res) => {
    const url = req.url || null;
    if (url && url === '/status') {
      res.writeHead(200, { 'Content-type': 'application/json' });
      res.write(JSON.stringify(status.state));
    } else {
      res.writeHead(404, 'Not Found');
    }
    res.end();
  });
  httpServer.listen(port, address);

  const io = new _socket2.default(httpServer);

  // start userEvents api
  const userEvents = (0, _UserEventsApi2.default)(io, blocks, log);

  io.httpServer.on('listening', () => {
    log.info(`Server listen on: ${address || '0.0.0.0'}:${port}`);
  });

  // broadcast new blocks
  blocks.events.on('newBlocks', result => {
    io.emit('data', (0, _apiLib.formatRes)({ action: 'newBlocks', result }));
  });

  // broadcast status
  status.events.on('newStatus', result => {
    io.emit('data', (0, _apiLib.formatRes)({ action: 'dbStatus', result }));
  });

  // broadcast txPool
  txPool.events.on('newPool', result => {
    io.emit('data', (0, _apiLib.formatRes)({ action: 'txPool', result }));
  });

  // broadcast txPool chart
  txPool.events.on('poolChart', result => {
    io.emit('data', (0, _apiLib.formatRes)({ action: 'txPoolChart', result }));
  });

  io.on('connection', socket => {
    socket.emit('open', { time: Date.now(), settings: (0, _apiLib.publicSettings)() });
    socket.emit('data', (0, _apiLib.formatRes)({ action: 'newBlocks', result: blocks.getLastBlocks() }));
    socket.emit('data', (0, _apiLib.formatRes)({ action: 'dbStatus', result: status.getState() }));
    socket.emit('data', (0, _apiLib.formatRes)({ action: 'txPool', result: txPool.getState() }));
    socket.emit('data', (0, _apiLib.formatRes)({ action: 'txPoolChart', result: txPool.getPoolChart() }));
    socket.on('message', () => {});
    socket.on('disconnect', () => {});
    socket.on('error', err => {
      log.debug('Socket Error: ' + err);
    });

    // data handler
    socket.on('data', async payload => {
      if (!payload) {
        socket.emit('Error', (0, _apiLib.formatError)(_apiLib.errors.INVALID_REQUEST));
      } else {
        const action = payload.action;
        const params = (0, _apiLib.filterParams)(payload.params);
        const module = (0, _apiLib.getModule)(payload.module);
        const delayed = (0, _apiLib.getDelayedFields)(module, action);
        try {
          let result = await blocks.run(module, action, params);
          if (delayed && userEvents) {
            const registry = !result.data && delayed.runIfEmpty;
            if (payload.getDelayed) {
              userEvents.send({
                action: delayed.action,
                module: delayed.module,
                params,
                socketId: socket.id,
                payload,
                block: blocks.getLastBlock().number });

            }
            result.delayed = { fields: delayed.fields, registry };
          }
          socket.emit('data', (0, _apiLib.formatRes)({ module, action, result, req: payload }));
        } catch (err) {
          log.debug(`Action: ${action}: ERROR: ${err}`);
          socket.emit('Error',
          (0, _apiLib.formatRes)({ module, action, result: null, req: payload, error: _apiLib.errors.INVALID_REQUEST }));

        }
      }
    });
  });
});

process.on('unhandledRejection', err => {
  log.error(err);
  // process.exit(1)
});
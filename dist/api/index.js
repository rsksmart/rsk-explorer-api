'use strict';var _socket = require('socket.io');var _socket2 = _interopRequireDefault(_socket);
var _dataSource = require('../lib/dataSource');var _dataSource2 = _interopRequireDefault(_dataSource);
var _Blocks = require('./Blocks');var _Blocks2 = _interopRequireDefault(_Blocks);
var _Status = require('./Status');var _Status2 = _interopRequireDefault(_Status);
var _Logger = require('../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);
var _utils = require('../lib/utils');
var _http = require('http');var _http2 = _interopRequireDefault(_http);
var _UserEventsApi = require('./UserEventsApi');var _UserEventsApi2 = _interopRequireDefault(_UserEventsApi);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _apiLib = require('./apiLib');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const port = _config2.default.server.port || '3000';
const log = (0, _Logger2.default)('explorer-api', _config2.default.api.log);
const delayedFields = _config2.default.api.delayedFields || {};

_dataSource2.default.then(db => {
  log.info('Database connected');

  // data collectors
  const blocks = new _Blocks2.default(db);
  const status = new _Status2.default(db);
  blocks.start();
  status.start();

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
  httpServer.listen(port);
  const io = new _socket2.default(httpServer);

  const userEvents = (0, _UserEventsApi2.default)(io, blocks, log);
  io.httpServer.on('listening', () => {
    log.info('Server listen on port ' + port);
  });

  blocks.events.on('newBlocks', result => {
    io.emit('data', (0, _apiLib.formatRes)('newBlocks', result));
  });

  status.events.on('newStatus', result => {
    io.emit('data', (0, _apiLib.formatRes)('dbStatus', result));
  });

  io.on('connection', socket => {
    socket.emit('open', { time: Date.now(), settings: (0, _apiLib.publicSettings)() });
    socket.emit('data', (0, _apiLib.formatRes)('newBlocks', blocks.getLastBlocks()));
    socket.emit('data', (0, _apiLib.formatRes)('dbStatus', status.getState()));
    socket.on('message', () => {});
    socket.on('disconnect', () => {});
    socket.on('error', err => {
      log.debug('Socket Error: ' + err);
    });

    socket.on('data', payload => {
      if (payload) {
        const action = payload.action;
        const params = (0, _utils.filterParams)(payload.params);
        const delayed = delayedFields[action];
        blocks.
        run(action, params).
        then(result => {
          if (delayed && userEvents) {
            const registry = !result.data && delayed.runIfEmpty;
            if (payload.getDelayed) {
              userEvents.send({
                action: delayed.action,
                params,
                socketId: socket.id,
                payload,
                block: blocks.getLastBlock().number });

            }
            result.delayed = { fields: delayed.fields, registry };
          }

          socket.emit('data', (0, _apiLib.formatRes)(action, result, payload));
        }).
        catch(err => {
          log.debug('Action: ' + action + ' ERROR: ' + err);
          socket.emit(
          'error',
          (0, _apiLib.formatRes)(action, null, payload, _apiLib.errors.INVALID_REQUEST));

        });
      } else {
        socket.emit('error', (0, _apiLib.formatError)(_apiLib.errors.INVALID_REQUEST));
      }
    });
  });
});

process.on('unhandledRejection', err => {
  log.error(err);
  // process.exit(1)
});
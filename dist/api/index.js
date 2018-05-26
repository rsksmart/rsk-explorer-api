'use strict';var _socket = require('socket.io');var _socket2 = _interopRequireDefault(_socket);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _dataSource = require('../lib/dataSource');var _dataSource2 = _interopRequireDefault(_dataSource);
var _Blocks = require('./Blocks');var _Blocks2 = _interopRequireDefault(_Blocks);
var _Status = require('./Status');var _Status2 = _interopRequireDefault(_Status);
var _types = require('../lib/types');
var _Logger = require('../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);
var _utils = require('../lib/utils');
var _http = require('http');var _http2 = _interopRequireDefault(_http);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const port = _config2.default.server.port || '3000';
const log = (0, _Logger2.default)('explorer-api', _config2.default.api.log);

_dataSource2.default.then(db => {
  log.info('Database connected');

  // data collectors
  // const erc20 = new Erc20(db)
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

  io.httpServer.on('listening', () => {
    log.info('Server listen on port ' + port);
  });

  blocks.events.on('newBlocks', data => {
    io.emit('data', formatRes('newBlocks', data));
  });

  blocks.events.on('block', data => {
    io.emit('data', formatRes('block', data));
  });

  status.events.on('newStatus', data => {
    io.emit('data', formatRes('dbStatus', data));
  });

  io.on('connection', socket => {
    io.emit('open', { time: Date.now(), settings: publicSettings() });
    io.emit('data', formatRes('newBlocks', blocks.getLastBlocks()));
    io.emit('data', formatRes('dbStatus', status.getState()));
    socket.on('message', () => {});
    socket.on('disconnect', () => {});
    socket.on('error', err => {
      log.error('Socket Error: ' + err);
    });

    socket.on('data', payload => {
      if (payload && payload.type) {
        let type = payload.type;
        let action = payload.action;
        let params = (0, _utils.filterParams)(payload.params);
        let collector = null;

        switch (type) {
          case 'blocks':
            collector = blocks;
            break;
          default:
            io.emit('error', formatError(_types.errors.INVALID_TYPE));
            break;}

        if (collector) {
          let resAction = type + action;
          collector.
          run(action, params).
          then(result => {
            io.emit('data', formatRes(resAction, result, payload));
          }).
          catch(err => {
            log.debug('Collector: ' + type + ', Action: ' + action + ' ERROR: ' + err);
            io.emit(
            'error',
            formatRes(resAction, null, payload, _types.errors.INVALID_REQUEST));

          });
        }
      } else {
        io.emit('error', formatError(_types.errors.INVALID_REQUEST));
      }
    });
  });
});

const publicSettings = () => {
  return _config2.default.publicSettings;
};

const formatRes = (action, result, req, error) => {
  let data;
  let pages;
  let next;
  let prev;
  let parentData;
  if (!result && !error) error = _types.errors.EMPTY_RESULT;
  if (error) {
    error = formatError(error);
  } else {
    data = result.DATA || null;
    pages = result.PAGES || null;
    next = result.NEXT || null;
    prev = result.PREV || null;
    parentData = result.PARENT_DATA || null;
  }
  if (!data && !error) error = formatError(_types.errors.EMPTY_RESULT);
  return { action, data, req, pages, error, prev, next, parentData };
};

const formatError = error => {
  let serverTime = Date.now();
  return { error, serverTime };
};

process.on('unhandledRejection', err => {
  log.error(err);
  // process.exit(1)
});
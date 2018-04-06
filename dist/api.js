'use strict';

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _config = require('./lib/config');

var _config2 = _interopRequireDefault(_config);

var _dataSource = require('./lib/dataSource');

var _dataSource2 = _interopRequireDefault(_dataSource);

var _blocksData = require('./lib/blocksData');

var _blocksData2 = _interopRequireDefault(_blocksData);

var _erc20data = require('./lib/erc20data');

var _erc20data2 = _interopRequireDefault(_erc20data);

var _statsData = require('./lib/statsData');

var _statsData2 = _interopRequireDefault(_statsData);

var _errors = require('./lib/errors');

var errors = _interopRequireWildcard(_errors);

var _Logger = require('./lib/Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _utils = require('./lib/utils');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const port = _config2.default.server.port || '3000';
const log = (0, _Logger2.default)('explorer-api', _config2.default.api.log);

_dataSource2.default.then(db => {
  log.info('Database connected');
  const io = new _socket2.default(port);

  io.httpServer.on('listening', () => {
    log.info('Server listen on port ' + port);
  });

  // data collectors
  const erc20 = new _erc20data2.default(db);
  const blocks = new _blocksData2.default(db);
  const stats = new _statsData2.default(db);
  blocks.start();
  erc20.start();
  stats.start();

  blocks.events.on('newBlocks', data => {
    io.emit('data', formatRes('newBlocks', data));
  });

  blocks.events.on('block', data => {
    io.emit('data', formatRes('block', data));
  });

  erc20.events.on('newTokens', data => {
    io.emit('data', formatRes('tokens', data));
  });

  stats.events.on('newStats', data => {
    io.emit('data', formatRes('stats', data));
  });

  io.on('connection', socket => {
    io.emit('open', { time: Date.now(), settings: publicSettings() });
    io.emit('data', formatRes('newBlocks', blocks.getLastBlocks()));
    io.emit('data', formatRes('tokens', erc20.getTokens()));
    io.emit('data', formatRes('stats', stats.getState()));
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
          case 'erc20':
            collector = erc20;
            break;
          default:
            io.emit('error', formatError(errors.INVALID_TYPE));
            break;
        }
        if (collector) {
          let resAction = type + action;
          collector.run(action, params).then(result => {
            io.emit('data', formatRes(resAction, result, payload));
          }).catch(err => {
            log.debug('Collector: ' + type + ', Action: ' + action + ' ERROR: ' + err);
            io.emit('error', formatRes(resAction, null, payload, errors.INVALID_REQUEST));
          });
        }
      } else {
        io.emit('error', formatError(errors.INVALID_REQUEST));
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
  if (!result && !error) error = errors.EMPTY_RESULT;
  if (error) {
    error = formatError(error);
  } else {
    data = result.DATA || null;
    pages = result.PAGES || null;
    next = result.NEXT || null;
    prev = result.PREV || null;
    parentData = result.PARENT_DATA || null;
  }
  if (!data && !error) error = formatError(errors.EMPTY_RESULT);
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
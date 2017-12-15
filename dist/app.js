'use strict';

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _config = require('./lib/config');

var _config2 = _interopRequireDefault(_config);

var _db = require('./lib/db');

var _db2 = _interopRequireDefault(_db);

var _dataBlocks = require('./lib/dataBlocks');

var _dataBlocks2 = _interopRequireDefault(_dataBlocks);

var _dataErc = require('./lib/dataErc20');

var _dataErc2 = _interopRequireDefault(_dataErc);

var _errors = require('./lib/errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const port = _config2.default.server.port || '3000';

_db2.default.then(db => {
  console.log('Database connected');
  const io = new _socket2.default(port);

  io.httpServer.on('listening', () => {
    console.log('Server listen on port ' + port);
  });

  // data collectors
  const erc20 = new _dataErc2.default(db);
  const blocks = new _dataBlocks2.default(db);
  blocks.start();

  blocks.events.on('newBlocks', data => {
    io.emit('data', formatRes('newBlocks', data));
  });

  blocks.events.on('block', data => {
    io.emit('data', formatRes('block', data));
  });

  io.on('connection', socket => {
    io.emit('open', { time: Date.now() });
    io.emit('data', formatRes('newBlocks', blocks.getLastBlocks()));
    io.emit('data', formatRes('tokens', erc20.getTokens()));
    socket.on('message', () => {});
    socket.on('disconnect', () => {});
    socket.on('error', err => {
      console.log(err);
    });

    socket.on('data', payload => {
      if (payload && payload.type) {
        let type = payload.type;
        let action = payload.action;
        let params = payload.options;
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
            console.log(err);
            io.emit('error', formatRes(resAction, null, payload, errors.INVALID_REQUEST));
          });
        }
      } else {
        io.emit('error', formatError(errors.INVALID_REQUEST));
      }
    });
  });
});

const formatRes = (action, result, req, error) => {
  let data;
  let pages;
  if (error) {
    error = formatError(error);
  } else {
    data = result.DATA || null;
    pages = result.PAGES || null;
  }
  return { action, data, req, pages };
};

const formatError = error => {
  let serverTime = Date.now();
  return { error, serverTime };
};

process.on('unhandledRejection', err => {
  console.error(err);
  // process.exit(1)
});
'use strict';

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _config = require('./lib/config');

var _config2 = _interopRequireDefault(_config);

var _db = require('./lib/db');

var _db2 = _interopRequireDefault(_db);

var _classBlocks = require('./lib/classBlocks');

var _classBlocks2 = _interopRequireDefault(_classBlocks);

var _classErc = require('./lib/classErc20');

var _classErc2 = _interopRequireDefault(_classErc);

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

  const erc20 = new _classErc2.default(db);

  const blocks = new _classBlocks2.default(db);

  blocks.events.on('newBlocks', data => {
    io.emit('data', formatData('newBlocks', data));
  });

  blocks.events.on('block', data => {
    console.log('newBlock', data);
    io.emit('data', formatData('block', data));
  });

  io.on('connection', socket => {
    io.emit('open', { time: Date.now() });
    io.emit('data', formatData('newBlocks', blocks.last));
    io.emit('data', formatData('tokens', erc20.getTokens()));
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
        switch (type) {
          case 'blocks':
            io.emit('data', formatData('blocks', blocks.last));
            break;
          case 'erc20':
            erc20.getTokenAction(action, params).then(data => {
              io.emit('data', formatData(type + action, data, payload));
            }).catch(err => {
              console.log(err);
              io.emit('error', formatError(errors.INVALID_REQUEST));
            });
            break;
          default:
            io.emit('error', formatError(errors.INVALID_TYPE));
            break;
        }
      } else {
        io.emit('error', formatError(errors.INVALID_REQUEST));
      }

      /*       blocks.findOne({ number: 1 }, {}, (err, doc) => {
        console.log(err, doc)
      }) */
    });
  });
});

const formatData = (action, data, req) => {
  return { action, data, req };
};

const formatError = error => {
  let serverTime = Date.now();
  return { error, serverTime };
};

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
'use strict';

var _config = require('../../lib/config.js');

var _config2 = _interopRequireDefault(_config);

var _dataSource = require('../../lib/dataSource.js');

var _dataSource2 = _interopRequireDefault(_dataSource);

var _Db = require('../../lib/Db');

var dataBase = _interopRequireWildcard(_Db);

var _Erc = require('./Erc20');

var _Erc2 = _interopRequireDefault(_Erc);

var _Logger = require('../../lib/Logger');

var _Logger2 = _interopRequireDefault(_Logger);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let config = Object.assign({}, _config2.default.erc20);

const log = (0, _Logger2.default)('Erc20_Service', config.log);
config.Logger = log;

const names = config.names || {};
const tokens = config.tokens || null;
const exporters = {};

if (!tokens) {
  log.warn('There are no tokens in config file');
  process.exit(1);
}

_dataSource2.default.then(async db => {
  log.debug('Database Connected');
  const tokensCollection = await dataBase.createCollection(db, config.tokenCollection);

  for (let t in tokens) {
    let token = tokens[t];
    let tokenConfig = formatToken(token);
    if (tokenConfig) {
      log.info('TOKEN: ' + JSON.stringify(token));
      tokensCollection.update({ _id: token.address }, {
        $set: token
      }, { upsert: true }).then(async () => {
        tokenConfig = Object.assign(tokenConfig, config);
        let collectionName = config.dbPrefix + token.address;
        log.info('Creating collection: ' + collectionName);
        let collection = await tokenCollection(db, collectionName);
        exporters[token.address] = new _Erc2.default(tokenConfig, collection);
      });
    }
  }
});

async function tokenCollection(db, name) {
  return dataBase.createCollection(db, name, [{
    key: { balance: 1 }
  }, {
    key: { timestamp: 1 }
  }, {
    key: { 'args._from': 1 }
  }, {
    key: { 'args._to': 1 }
  }]);
}

function formatToken(token) {
  token = checkToken(token);
  if (token) {
    let newToken = {};
    for (let p in token) {
      let pp = 'token' + p.charAt(0).toUpperCase() + p.slice(1);
      newToken[pp] = token[p];
    }
    return newToken;
  } else {
    log.warn('Invalid token configuration');
  }
}

function checkToken(token) {
  if (token.address) {
    return token;
  }
}

process.on('unhandledRejection', err => {
  log.error(err);
  process.exit(1);
});
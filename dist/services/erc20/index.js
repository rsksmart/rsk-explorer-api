'use strict';

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

var _config = require('../../lib/config.js');

var _config2 = _interopRequireDefault(_config);

var _db = require('../../lib/db.js');

var _db2 = _interopRequireDefault(_db);

var _erc20Class = require('./erc20Class.js');

var _erc20Class2 = _interopRequireDefault(_erc20Class);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const provider = new _web2.default.providers.HttpProvider('http://' + _config2.default.erc20.node + ':' + _config2.default.erc20.port);
const names = _config2.default.erc20.names || {};
const tokens = _config2.default.erc20.tokens || null;
const exporters = {};

if (!tokens) {
  console.log('There are no tokens in config file');
  process.exit(1);
}

let erc20Config = Object.assign({}, _config2.default.erc20);
erc20Config.provider = provider;

_db2.default.then(db => {
  console.log('Database Connected');
  const tokensCollection = db.collection(_config2.default.erc20.tokenCollection);

  for (let t in tokens) {
    let token = tokens[t];
    let tokenConfig = formatToken(token);
    if (tokenConfig) {
      console.log('TOKEN: ' + JSON.stringify(token));
      let tokenDoc = Object.assign({}, token);
      tokensCollection.update({ _id: token.address }, {
        $set: token
      }, { upsert: true }).then(() => {
        tokenConfig = Object.assign(tokenConfig, erc20Config);
        createTokenCollection(db, token).then(collection => {
          exporters[token.address] = new _erc20Class2.default(tokenConfig, collection);
        });
      });
    }
  }
});

const formatToken = token => {
  token = checkToken(token);
  if (token) {
    let newToken = {};
    for (let p in token) {
      let pp = 'token' + p.charAt(0).toUpperCase() + p.slice(1);
      newToken[pp] = token[p];
    }
    return newToken;
  } else {
    console.log('Invalid token configuration');
  }
};

const checkToken = token => {
  if (token.address) {
    return token;
  }
};

const createTokenCollection = async (db, token) => {
  const name = _config2.default.erc20.dbPrefix + token.address;
  console.log('Creating collection: ' + name);
  const collection = db.collection(name);
  console.log('Creating indexes');
  let doc = await collection.createIndexes([{
    key: { balance: 1 }
  }, {
    key: { timestamp: 1 }
  }, {
    key: { 'args._from': 1 }
  }, {
    key: { 'args._to': 1 }
  }]);
  if (!doc.ok) {
    console.log('Error creating indexes');
    // process.exit(1)
  }
  return collection;
};

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
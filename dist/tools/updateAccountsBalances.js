'use strict';

var _config = require('../lib/config');

var _config2 = _interopRequireDefault(_config);

var _dataSource = require('../lib/dataSource');

var _dataSource2 = _interopRequireDefault(_dataSource);

var _Logger = require('../lib/Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _web3Connect = require('../lib/web3Connect');

var _web3Connect2 = _interopRequireDefault(_web3Connect);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = (0, _Logger2.default)('updateAccountsBalances');
const web3 = (0, _web3Connect2.default)(_config2.default.blocks.node, _config2.default.blocks.port);

_dataSource2.default.then(db => {
  let Accounts = db.collection(_config2.default.blocks.accountsCollection);
  update(Accounts);
});

const update = Accounts => {

  if (web3.isConnected()) {
    let n = 0;
    Accounts.count().then(total => {
      Accounts.find().forEach(account => {
        n++;
        log.info(`Getting Balance ${n} of ${total}, ${account.address}`);
        if (isAddress(account.address)) {
          web3.eth.getBalance(account.address, 'latest', (err, balance) => {
            log.info(`Updating balance of account ${account.address}`);
            if (!err) {
              account.balance = balance;
              Accounts.updateOne({ _id: account._id }, { $set: account }).catch(err => log.error(err));
            }
          });
        }
      });
    });
  } else {
    log.info('web3 is not connected');
    update(Accounts);
  }
};

const isAddress = address => {
  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    // check if it has the basic requirements of an address
    return false;
  } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
    // If it's all small caps or all all caps, return true
    return true;
  } else {
    // Otherwise check each case
    return false;
  }
};

process.on('unhandledRejection', err => {
  log.error(err);
});
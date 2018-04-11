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
  let Addresses = db.collection(_config2.default.blocks.addrCollection);
  update(Addresses);
});

const update = Addrs => {

  if (web3.isConnected()) {
    let n = 0;
    Addrs.count().then(total => {
      Addrs.find().forEach(address => {
        n++;
        log.info(`Getting Balance ${n} of ${total}, ${address.address}`);
        if (isAddress(address.address)) {
          web3.eth.getBalance(address.address, 'latest', (err, balance) => {
            log.info(`Updating balance of address ${address.address}`);
            if (!err) {
              address.balance = balance;
              Addrs.updateOne({ _id: address._id }, { $set: address }).catch(err => log.error(err));
            }
          });
        }
      });
    });
  } else {
    log.info('web3 is not connected');
    update(Addrs);
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
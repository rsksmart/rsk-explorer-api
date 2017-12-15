'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dataCollector = require('./dataCollector');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const perPage = _config2.default.api.perPage;
const keyName = 'address';
const collectionName = _config2.default.erc20.tokenCollection || 'erc20Tokens';

class Erc20 extends _dataCollector.DataCollector {
  constructor(db) {
    super(db, { perPage, keyName, collectionName });
    this.tokenList = [];
    this.dbPrefix = _config2.default.erc20.dbPrefix || 'erc20_';
    this.updateTokens();
  }
  getTokens() {
    return { DATA: this.tokenList };
  }
  run(action, params) {
    return this.itemPublicAction(action, params);
  }
  updateTokens() {
    this.collection.find().toArray((err, docs) => {
      if (err) {
        console.log(err);
      } else {
        this.tokenList = docs;
        for (let token of docs) {
          let address = token.address;
          if (address) {
            let collectionName = this.dbPrefix + address;
            this.addItem(collectionName, address, Token);
          }
        }
      }
    });
  }
}

class Token extends _dataCollector.DataCollectorItem {
  constructor(collection, address) {
    super(collection, address);
    this.publicActions = {
      getEvent: params => {
        let _id = params._id;
        return this.getOne({ _id });
      },
      getEvents: params => {
        let query = { balance: { $exists: false } };
        let sort = { timestamp: -1 };
        return this.getPageData(query, params, sort);
      },
      getAccount: params => {
        let account = params.account;
        let query = {
          $or: [{ 'args._from': account }, { 'args._to': account }]
        };
        let sort = { timestamp: -1 };
        return this.db.findOne({ _id: account }).then(balance => {
          return this.getPageData(query, params, sort).then(res => {
            let PAGES = res.PAGES;
            let DATA = { account: res.DATA, balance };
            return { DATA, PAGES };
          });
        });
      },
      getAccounts: params => {
        let query = { balance: { $exists: true } };
        let sort = { _id: 1 };
        return this.getPageData(query, params, sort);
      },
      searchByAddress: params => {}
    };
  }
}

exports.default = Erc20;
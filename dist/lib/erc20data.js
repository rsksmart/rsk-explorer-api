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
  tick() {
    this.eventsCount();
  }
  getTokens() {
    return this.formatData(Object.values(this.tokenList));
  }
  eventsCount() {
    for (let key in this.items) {
      this.updateTokenEvents(key);
    }
    this.events.emit('newTokens', this.getTokens());
  }
  run(action, params) {
    return this.itemPublicAction(action, params);
  }
  addTokenToList(key, token) {
    if (token) {
      this.tokenList[key] = token;
      this.updateTokenEvents(key);
    }
  }

  updateTokenEvents(key) {
    let token = this.getItem({ key });
    if (token) {
      token.getTotalEvents().then(total => {
        this.tokenList[key]['Events'] = total;
      });
    }
  }
  updateTokens() {
    this.collection.find().toArray((err, docs) => {
      if (err) {
        console.log(err);
      } else {
        for (let token of docs) {
          let address = token.address;
          if (address) {
            let collectionName = this.dbPrefix + address;
            this.addItem(collectionName, address, Token);
            this.addTokenToList(address, token);
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
        params.sort = { timestamp: -1 };
        return this.getPageData(query, params);
      },
      getAccount: params => {
        let account = params.account;
        let query = {
          $or: [{ 'args._from': account }, { 'args._to': account }]
        };
        params.sort = { timestamp: -1 };
        return this.db.findOne({ _id: account }).then(balance => {
          return this.getPageData(query, params).then(res => {
            let PAGES = res.PAGES;
            let DATA = { account: res.DATA, balance };
            return { DATA, PAGES };
          });
        });
      },
      getAccounts: params => {
        let query = { balance: { $exists: true } };
        params.sort = { _id: 1 };
        return this.getPageData(query, params);
      },
      searchByAddress: params => {}
    };
  }
  getTotalEvents() {
    return this.db.count({ balance: { $exists: false } }).then(total => {
      return total;
    });
  }
}

exports.default = Erc20;
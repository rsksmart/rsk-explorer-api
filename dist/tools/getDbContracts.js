'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}


_dataSource2.default.then(db => {
  let addresses = db.collection('addresses');
  addresses.find({ type: 'contract' }).
  project({ _id: 0, address: 1 }).
  toArray().
  then(res => {
    console.log(JSON.stringify(res));
    process.exit(0);
  });

});
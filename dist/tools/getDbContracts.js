"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

(0, _dataSource.default)({ skipCheck: true }).then(({ db }) => {
  let addresses = db.collection('addresses');
  addresses.find({ type: 'contract' }).
  project({ _id: 0, address: 1 }).
  toArray().
  then(res => {
    console.log(JSON.stringify(res));
    process.exit(0);
  });

});
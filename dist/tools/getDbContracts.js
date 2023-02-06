"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _address = require("../repositories/address.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

(0, _dataSource.default)({ skipCheck: true }).then(({ db }) => {
  let addresses = db.collection('addresses');

  const query = { type: 'contract' };
  const project = { _id: 0, address: 1 };

  _address.addressRepository.find(query, project, addresses).
  then(res => {
    console.log(JSON.stringify(res));
    process.exit(0);
  });

});
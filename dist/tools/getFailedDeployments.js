'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const config = Object.assign({}, _config2.default.blocks);
_dataSource2.default.then(async db => {
  try {
    const Addrs = db.collection(config.collections.Addrs);
    let result = await Addrs.find({ createdByTx: { $exists: true }, type: 'account' }).
    project({ address: 1, type: 1, _id: 0 }).
    toArray();
    if (result) {
      result = result.map(r => r.address);
      console.log(JSON.stringify(result));
    } else {
      console.log('No results');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
});
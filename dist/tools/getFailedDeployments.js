"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _config = _interopRequireDefault(require("../lib/config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const config = Object.assign({}, _config.default.blocks);
(0, _dataSource.default)({ skipCheck: true }).then(async ({ db }) => {
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
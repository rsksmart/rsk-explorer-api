'use strict';var _Block = require('../services/classes/Block');var _Block2 = _interopRequireDefault(_Block);
var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _collections = require('../lib/collections');var _collections2 = _interopRequireDefault(_collections);
var _Blocks = require('../services/blocks/Blocks');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const config = Object.assign({}, _config2.default.blocks);
const number = process.argv[2] || 'latest';
const opt = process.argv[3];
const save = opt === '--save';
console.log(`Getting block ${number}`);
_dataSource2.default.then(db => {
  const blocks = (0, _Blocks.Blocks)(db, config, _collections2.default);
  console.time('block');
  let block = new _Block2.default(number, blocks);
  block.fetch().then(blockdata => {
    console.dir(blockdata, { colors: true });
    console.timeEnd('block');
    if (save) {
      console.log('saving block');
      block.save().
      then(res => console.log('Block saved')).
      catch(err => console.log(`Error saving block: ${err}`));
    }
  });
});
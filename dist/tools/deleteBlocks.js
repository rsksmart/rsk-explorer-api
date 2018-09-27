'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _Block = require('../services/classes/Block');
var _BlocksBase = require('../lib/BlocksBase');
var _cli = require('../lib/cli');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

_dataSource2.default.then(async db => {
  const options = new _BlocksBase.BlocksBase(db);
  const p = path => path.split('/').pop();
  const help = () => {
    (0, _cli.info)(`Use: ${p(process.argv[0])} ${p(process.argv[1])} [fromBlock-toBlock] ${_cli.orange} e.g. 400-6756`);
    process.exit(0);
  };

  let fromTo = process.argv[2];
  if (!fromTo) help();
  fromTo = fromTo.split('-');
  let f = fromTo[0];
  let t = fromTo[1];

  if (!f && !t) help();
  if (f > t) help();
  try {
    let Q = [];
    while (t >= f) {
      let b = await (0, _Block.getBlockFromDb)(t, options.collections.Blocks);
      if (b) {
        let number = b.number;
        let color = (0, _cli.ansiCode)(Number(number.toString().split('').pop()) + 30);
        console.log(`${_cli.reset} ${color} ● ● ● Removig block  ${number} ${b.hash}`);
        Q.push((0, _Block.deleteBlockDataFromDb)(b.hash, number, options.collections));
      }
      t--;
    }
    Promise.all(Q).then(() => process.exit());
  } catch (err) {
    (0, _cli.error)(err);
  }
});
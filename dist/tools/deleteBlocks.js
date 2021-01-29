"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _Block = require("../services/classes/Block");
var _BlockSummary = require("../services/classes/BlockSummary");
var _BlocksBase = require("../lib/BlocksBase");
var _rskJsCli = require("@rsksmart/rsk-js-cli");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

(0, _dataSource.default)({ skipCheck: true }).then(async ({ db }) => {
  const options = new _BlocksBase.BlocksBase(db);
  const { collections } = options;
  const p = path => path.split('/').pop();
  const help = () => {
    const myName = p(process.argv[1]);
    _rskJsCli.log.info(`Use: ${p(process.argv[0])} ${myName} [blockNumber] | [fromBlock-toBlock]`);
    _rskJsCli.log.info(`e.g. ${_rskJsCli.orange} ${myName} 400`);
    _rskJsCli.log.info(`e.g. ${_rskJsCli.orange} ${myName} 400-456`);
    process.exit(0);
  };

  let fromTo = process.argv[2];
  let deleteSummary = process.argv.find(x => x === '--deleteSummary');
  if (!fromTo) help();
  fromTo = fromTo.split('-');
  let [f, t] = fromTo;

  if (!f) help();
  if (!t) t = f;
  if (isNaN(f) || isNaN(t)) help();
  if (f > t) help();

  try {
    let Q = [];
    while (t >= f) {
      let b = await (0, _Block.getBlockFromDb)(t, collections.Blocks);
      let color = (0, _rskJsCli.ansiCode)(Number(t.toString().split('').pop()) + 30);
      if (b) {
        let { hash, number } = b;
        console.log(`${_rskJsCli.reset} ${color} ● ● ● Removing block  ${number} ${hash}`);
        Q.push((0, _Block.deleteBlockDataFromDb)(b.hash, number, collections));
      }
      if (deleteSummary) {
        if (b) {
          Q.push((0, _BlockSummary.deleteBlockSummaryFromDb)(b.hash, options.collections));
        } else {
          console.log(`${_rskJsCli.reset} ${color} ● ● ● Removing ALL summaries for blockNumber: ${t}`);
          let summaries = await (0, _BlockSummary.getBlockSummariesByNumber)(t, collections);
          if (summaries.length) {
            for (let summary of summaries) {
              Q.push((0, _BlockSummary.deleteBlockSummaryFromDb)(summary.hash, collections));
            }
          }
        }
      }
      t--;
    }
    Promise.all(Q).then(() => process.exit());
  } catch (err) {
    (0, _rskJsCli.error)(err);
  }
});
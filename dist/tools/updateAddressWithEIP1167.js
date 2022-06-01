"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.start = start;var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _rskContractParser = require("../../.yalc/@rsksmart/rsk-contract-parser");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

async function start() {
  const parser = new _rskContractParser.ContractParser();
  const { collections } = await (0, _dataSource.default)();
  const { EIP_1167_PREFIX, EIP_1167_SUFFIX } = _rskContractParser.Constants;
  const proxyRegex = new RegExp(`^(0x)?${EIP_1167_PREFIX}[a-f0-9]{40}${EIP_1167_SUFFIX}$`, 'i');
  const collectionWithProxies = await collections.Addrs.find({ code: proxyRegex }).toArray();

  for (let i = 0; i < collectionWithProxies.length; i++) {
    if (!collectionWithProxies[i].masterCopy && collectionWithProxies[i].code) {
      const updateResult = await collections.Addrs.updateOne({ _id: collectionWithProxies[i]._id },
      { $set: { masterCopy: parser.getEip1167MasterCopy(collectionWithProxies[i].code) } });
      console.log('updating id => ', collectionWithProxies[i]._id);
      console.log(updateResult);
    }
  }
  process.exit(0);
}

start();
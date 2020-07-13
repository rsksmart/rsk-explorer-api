"use strict";
var _dataSource = require("../lib/dataSource");
var _config = _interopRequireDefault(require("../lib/config"));
var _nod3Connect = require(".././lib/nod3Connect");
var _nod = require("nod3");
var _BlockTrace = _interopRequireDefault(require("../services/classes/BlockTrace"));
var _Logger = require("../lib/Logger");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const { HttpProvider } = _nod.Nod3.providers;
const log = (0, _Logger.Logger)('cacheTraces', { level: 'trace' });
const { source } = _config.default;

const nod3 = createNod3(source);
nod3.setDebug((0, _nod3Connect.nod3Log)(log));

const { argv } = process;

let lowerBlock = argv[2] || 0;
let higherBlock = argv[3] || 'latest';
argv[4] = parseInt(argv[4]);
const sourcesLen = Array.isArray(source) ? source.length : 1;
const QUEUE_SIZE = !isNaN(argv[4]) ? argv[4] : sourcesLen;
const requested = {};

if (isNaN(parseInt(lowerBlock))) help(`Invalid lowerBlock value ${argv[2]}`);
if (higherBlock !== 'latest') {
  higherBlock = parseInt(higherBlock);
  if (isNaN(higherBlock)) help(`Invalid lowerBlock value ${argv[3]}`);
  if (higherBlock < lowerBlock) help();
}

main().then(() => {
  log.info('Done');
  process.exit(0);
});

async function main() {
  try {
    const { initConfig, collections } = await (0, _dataSource.setup)();
    log.trace(JSON.stringify({ lowBlock: lowerBlock, highBlock: higherBlock }));
    log.info(initConfig.net);

    let block = await nod3.eth.getBlock(higherBlock);
    const tasks = [];
    for (let i = 0; i < QUEUE_SIZE; i++) {
      let { hash, parentHash } = block;
      tasks.push(getBlocks(hash, { collections, initConfig }));
      block = await nod3.eth.getBlock(parentHash);
    }
    await Promise.all(tasks);
  } catch (err) {
    showErrorAndExit(err);
  }
}

async function getBlocks(hash, opts) {
  try {
    let block = await nod3.eth.getBlock(hash);
    let { number, parentHash } = block;
    if (number <= lowerBlock) return;
    log.info(`Get trace ${hash}/${number}`);
    let res = await saveBlockTrace(hash, opts);
    if (res) log.info(`Trace ${hash} done`);
    return getBlocks(parentHash, opts);
  } catch (err) {
    return Promise.reject(err);
  }
}

function createNod3(source) {
  if (Array.isArray(source)) {
    const providers = source.map(({ url }) => new HttpProvider(url));
    const { nod3, router } = new _nod.Nod3Router(providers);
    router.reset();
    router.add({ module: 'subscribe', to: 0 });
    return nod3;
  } else {
    let nod3 = new _nod.Nod3(new HttpProvider(source.url));
    return nod3;
  }
}

async function saveBlockTrace(hash, { collections, initConfig }) {
  try {
    if (requested[hash] !== undefined) return;
    requested[hash] = false;
    log.info(`Waiting for block_trace ${hash}`);
    let blockTrace = new _BlockTrace.default(hash, { nod3, collections, initConfig });
    await blockTrace.save();
    requested[hash] = true;
    return hash;
  } catch (err) {
    showErrorAndExit(err);
  }
}

function showErrorAndExit(err) {
  log.error(err);
  process.exit(9);
}

const p = path => path.split('/').pop();

function help(msg) {
  if (msg) {
    log.error(msg);
    console.log();
  }
  const myName = p(process.argv[1]);
  log.info(`Use: ${p(process.argv[0])} ${myName} [lowerBlock] [higherBlock] `);
  log.info(`e.g. ${myName} 0 456`);
  process.exit(0);
}
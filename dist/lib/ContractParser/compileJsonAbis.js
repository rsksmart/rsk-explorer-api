'use strict';var _fs = require('fs');var _fs2 = _interopRequireDefault(_fs);
var _util = require('util');var _util2 = _interopRequireDefault(_util);
var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _ContractParser = require('./ContractParser');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const readDir = _util2.default.promisify(_fs2.default.readdir);
const readFile = _util2.default.promisify(_fs2.default.readFile);
const writeFile = _util2.default.promisify(_fs2.default.writeFile);

const jsonPath = `${__dirname}/jsonAbis`;
const destinationFile = `${__dirname}/compiled_abi.json`;

compileAbi().then(abi => {
  writeFile(destinationFile, JSON.stringify(abi, null, 2)).
  then(() => {
    console.log(`new abi saved on ${destinationFile}`);
    process.exit(0);
  });
});

async function compileAbi() {
  try {
    let files = await readDir(jsonPath);
    files = files.filter(file => _path2.default.extname(file) === '.json');
    if (!files || !files.length) throw new Error('No json files');
    let abi = await Promise.all(files.map(file => readJson(`${jsonPath}/${file}`)));
    abi = abi.reduce((a, v, i, array) => v.concat(a));
    abi = processAbi(abi);
    return abi;
  } catch (err) {
    console.log('Compile Error', err);
    process.exit(9);
  }
}

async function readJson(file) {
  console.log(`Reading file ${file}`);
  try {
    let json = await readFile(file, 'utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.log(file, err);
    return Promise.reject(err);
  }
}

function processAbi(abi) {
  // remove fallbacks
  abi = abi.filter(a => a.type !== 'fallback');
  // remove duplicates
  abi = [...new Set(abi.map(a => JSON.stringify(a)))].map(a => JSON.parse(a));
  // add signatures
  abi = (0, _ContractParser.addSignatureDataToAbi)(abi);
  // detect 4 bytes collisions
  let signatures = abi.map(a => a[_ContractParser.ABI_SIGNATURE].signature).filter(v => v);
  let fourBytes = signatures.map(s => s.slice(0, 8));
  if (fourBytes.length !== [...new Set(fourBytes)].length) {
    throw new Error('4bytes collision');
  }
  return abi;
}

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(9);
});
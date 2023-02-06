"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ContractVerifierModule = ContractVerifierModule;exports.replaceImport = replaceImport;exports.extractUsedSourcesFromRequest = extractUsedSourcesFromRequest;exports.getVerificationId = getVerificationId;exports.default = exports.versionsId = void 0;var _socket = _interopRequireDefault(require("socket.io-client"));
var _StoredConfig = require("../../lib/StoredConfig");
var _rskUtils = require("@rsksmart/rsk-utils");
var _contractVerification = require("../../repositories/contractVerification.repository");
var _verificationResults = require("../../repositories/verificationResults.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

// id to store solc versions list on Config collection
const versionsId = '_contractVerifierVersions';exports.versionsId = versionsId;

function ContractVerifierModule(db, collections, { url } = {}, { log } = {}) {
  log = log || console;
  const storedConfig = (0, _StoredConfig.StoredConfig)(db);
  const socket = _socket.default.connect(url, { reconnect: true });
  const collection = collections.ContractVerification;
  let versions;

  socket.on('connect', data => {
    // request solc list
    log.debug(`Requesting solc versions list`);
    socket.emit('data', { action: 'versions' });
  });

  socket.on('error', err => {
    log.error(err);
  });

  // server responses
  socket.on('data', async msg => {
    try {
      const { data, action, error, request } = msg;
      switch (action) {
        case 'versions':
          log.debug(`Updating solc versions list`);
          versions = Object.assign({}, data);
          // temporal solution to '.' in field names
          await storedConfig.update(versionsId, {}, { create: true });
          storedConfig.update(versionsId, versions).catch(err => {
            log.warn(err);
          });
          break;
        // verification result
        case 'verify':
          const result = data ? data.result : null;
          let { _id, address } = request;
          if (!_id) throw new Error(`Missing _id {$request}`);
          // _id = ObjectID(_id)
          log.debug(`New verification received ${address}`);
          // Update verification
          const match = checkResult(result || {});
          log.debug(`Updating verification ${_id}`);
          const res = await _contractVerification.contractVerificationRepository.updateOne({ _id }, { $set: { error, result, match } }, {}, collection);
          if (!res.result.ok) throw new Error(`Error updating verification ${_id}`);

          // store verification positive results
          if (match && !error) {
            log.debug(`Saving verification result ${address}`);
            const sources = extractUsedSourcesFromRequest(request, result);
            const { abi } = result;
            const doc = { address, match, request, result, abi, sources, timestamp: Date.now() };
            const inserted = await _verificationResults.verificationResultsRepository.insertOne(doc, collection);
            if (!inserted.result.ok) throw new Error('Error inserting verification result');
            log.debug(`Verification result inserted: ${address}/${inserted.result.insertedId}`);
          }
          break;}

    } catch (err) {
      log.error(err);
    }
  });

  const getVersions = msg => {
    const { payload } = msg;
    const { module } = payload;
    msg.module = module;
    if (versions) msg.data = versions;else
    msg.error = 'missing versions';
    return msg;
  };

  const requestVerification = async msg => {
    try {
      const { payload, result } = msg;
      const { data } = result;
      const { module, action } = payload;
      const { address } = data;
      // delete data._id
      const { _id } = data;
      if (!address) throw new Error(`Missing address in verification`);
      let res = await _contractVerification.contractVerificationRepository.insertOne({ _id, address, request: data, timestamp: Date.now() }, collection);
      const id = res.insertedId;
      if (!id || id !== _id) throw new Error(`Error creating pending verification`);
      data._id = id;
      log.debug(`Sending verification to verifier ID:${id}`);
      if (!socket.connected) throw new Error('Cannot connect to contract verifier');
      socket.emit('data', { action, params: data });
      msg.module = module;
      msg.data = { address, id };
      return msg;
    } catch (err) {
      return Promise.reject(err);
    }
  };
  const checkResult = ({ bytecodeHash, resultBytecodeHash }) => {
    try {
      if (!bytecodeHash || bytecodeHash.length !== 66) throw new Error('Invalid bytecodeHash');
      if (!resultBytecodeHash) throw new Error('resultBytecodeHash is empty');
      return resultBytecodeHash === bytecodeHash;
    } catch (err) {
      log.debug(err);
      return false;
    }
  };
  return Object.freeze({ getVersions, requestVerification });
}

function replaceImport(content, name) {
  const re = new RegExp(`^import\\s*"([A-Za-z-0-9_\\/\\.]*(/${name}))";$`);
  return content.replace(re, function (a, b) {
    return a.replace(b, `./${name}`);
  });
}

function extractUsedSourcesFromRequest({ source, imports }, { usedSources }) {
  const sourceData = imports[0];
  // fix it with hash
  if (source === sourceData.contents) {
    sourceData.file = sourceData.name;
    usedSources.unshift(sourceData);
  }
  // replaces paths in in imports
  imports = imports.map(i => {
    let { name, contents } = i;
    usedSources.forEach(s => {
      let { file } = s;
      contents = contents.split('\n').map(line => replaceImport(line, file)).join('\n');
    });
    return { contents, name };
  });

  return usedSources.map(s => {
    let { file: name } = s;
    let imp = imports.find(i => i.name === name);
    const { contents } = imp;
    return { name, contents };
  });
}

function getVerificationId({ address }) {
  if (!(0, _rskUtils.isAddress)(address)) throw new Error(`Invalid address ${address}`);
  const timestamp = Date.now();
  return (0, _rskUtils.add0x)((0, _rskUtils.keccak256)(`${address}${timestamp}`));
}var _default =

ContractVerifierModule;exports.default = _default;
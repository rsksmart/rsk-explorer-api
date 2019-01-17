'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.erc165IdFromMethods = exports.erc165Id = exports.addSignatureDataToAbi = exports.abiSignatureData = exports.getInputsIndexes = exports.removeAbiSignaureData = exports.solidityName = exports.soliditySelector = exports.soliditySignature = exports.abiMethods = exports.abiEvents = exports.setAbi = exports.INTERFACE_ID_BYTES = exports.ABI_SIGNATURE = undefined;var _utils = require('../utils');

const ABI_SIGNATURE = exports.ABI_SIGNATURE = '__signatureData';

const INTERFACE_ID_BYTES = exports.INTERFACE_ID_BYTES = 4;

const setAbi = exports.setAbi = abi => addSignatureDataToAbi(abi, true);

const abiEvents = exports.abiEvents = abi => abi.filter(v => v.type === 'event');

const abiMethods = exports.abiMethods = abi => abi.filter(v => v.type === 'function');

const soliditySignature = exports.soliditySignature = name => (0, _utils.keccak256)(name);

const soliditySelector = exports.soliditySelector = signature => signature.slice(0, 8);

const solidityName = exports.solidityName = abi => {
  let { name, inputs } = abi;
  inputs = inputs ? inputs.map(i => i.type) : [];
  return name ? `${name}(${inputs.join(',')})` : null;
};

const removeAbiSignaureData = exports.removeAbiSignaureData = abi => {
  if (undefined !== abi[ABI_SIGNATURE]) delete abi[ABI_SIGNATURE];
  return abi;
};

const getInputsIndexes = exports.getInputsIndexes = abi => {
  let { inputs } = abi;
  return inputs && abi.type === 'event' ? inputs.map(i => i.indexed) : null;
};

const abiSignatureData = exports.abiSignatureData = abi => {
  let method = solidityName(abi);
  let signature = method ? soliditySignature(method) : null;
  let index = getInputsIndexes(abi);
  let indexed = index ? index.filter(i => i === true).length : 0;
  return { method, signature, index, indexed };
};

const addSignatureDataToAbi = exports.addSignatureDataToAbi = (abi, skip) => {
  abi.map((value, i) => {
    if (!value[ABI_SIGNATURE] || !skip) {
      value[ABI_SIGNATURE] = abiSignatureData(value);
    }
  });
  return abi;
};

const erc165Id = exports.erc165Id = selectors => {
  let id = selectors.map(s => Buffer.from(s, 'hex')).
  reduce((a, bytes) => {
    for (let i = 0; i < INTERFACE_ID_BYTES; i++) {
      a[i] = a[i] ^ bytes[i];
    }
    return a;
  }, Buffer.alloc(INTERFACE_ID_BYTES));
  return (0, _utils.add0x)(id.toString('hex'));
};

const erc165IdFromMethods = exports.erc165IdFromMethods = methods => {
  return erc165Id(methods.map(m => soliditySelector(soliditySignature(m))));
};
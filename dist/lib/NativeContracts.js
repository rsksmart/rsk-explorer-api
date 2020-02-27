"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.NativeContracts = NativeContracts;exports.default = void 0;function NativeContracts({ nativeContracts } = {}) {
  if (!nativeContracts) return null;
  const names = Object.keys(nativeContracts);

  const getNativeContractAddress = contractName => {
    return nativeContracts[contractName];
  };
  const getNativeContractName = address => {
    return names.find(name => nativeContracts[name] === address);
  };

  const isNativeContract = address => getNativeContractName(address);

  return Object.freeze({ getNativeContractAddress, getNativeContractName, isNativeContract });
}var _default =

NativeContracts;exports.default = _default;
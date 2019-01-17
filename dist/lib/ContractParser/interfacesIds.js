'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.interfacesIds = undefined;var _lib = require('./lib');

const erc20methods = [
'totalSupply()',
'balanceOf(address)',
'allowance(address,address)',
'transfer(address,uint256)',
'approve(address,uint256)',
'transferFrom(address,address,uint256)'];


const erc677Methods = erc20methods.concat([
'transferAndCall(address,uint256,bytes)']);


const interfacesIds = exports.interfacesIds = {
  ERC20: makeInterface(erc20methods),
  ERC677: makeInterface(erc677Methods),
  ERC165: makeInterface(['supportsInterface(bytes4)']),
  ERC721: makeInterface([
  'balanceOf(address)',
  'ownerOf(uint256)',
  'approve(address,uint256)',
  'getApproved(uint256)',
  'setApprovalForAll(address,bool)',
  'isApprovedForAll(address,address)',
  'transferFrom(address,address,uint256)',
  'safeTransferFrom(address,address,uint256)',
  'safeTransferFrom(address,address,uint256,bytes)']),

  ERC721Enumerable: makeInterface([
  'totalSupply()',
  'tokenOfOwnerByIndex(address,uint256)',
  'tokenByIndex(uint256)']),

  ERC721Metadata: makeInterface([
  'name()',
  'symbol()',
  'tokenURI(uint256)']),

  ERC721Exists: makeInterface([
  'exists(uint256)']) };



function makeInterface(methods) {
  let id = (0, _lib.erc165IdFromMethods)(methods);
  return { methods, id };
}exports.default =

interfacesIds;
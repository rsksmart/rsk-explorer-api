'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.default = {
  blocksCollection: [
  {
    key: { number: 1 },
    unique: true },

  {
    key: { hash: 1 },
    unique: true },

  {
    key: { timestamp: 1 },
    name: 'blocksTime' },

  {
    key: { miner: 1 },
    name: 'blocksMiner' },

  {
    key: { txs: 1 },
    name: 'blocksTxs' },

  {
    key: { size: 1 },
    name: 'blocksSize' }],


  txCollection: [
  {
    key: { hash: 1 },
    unique: true },

  {
    key: {
      blockNumber: -1,
      transactionIndex: -1 },

    name: 'blockTrasaction' },

  {
    key: { blockNumber: 1 },
    name: 'blockIndex' },

  {
    key: { from: 1 },
    name: 'fromIndex' },

  {
    key: { to: 1 },
    name: 'toIndex' },

  {
    key: { value: 1 },
    name: 'valueIndex' },

  {
    key: { timestamp: 1 },
    name: 'timeIndex' },

  {
    key: { txType: 1 },
    name: 'txTypeIndex' }],


  addrCollection: [
  {
    key: { address: 1 },
    unique: true },

  {
    key: { balance: 1 },
    name: 'balanceIndex' },

  {
    key: { type: 1 },
    name: 'addTypeIndex' },

  {
    key: { name: 1 },
    name: 'addressNameIndex' }],


  statusCollection: [
  {
    key: { timestamp: 1 },
    unique: true }],


  eventsCollection: [
  {
    key: { address: 1 } },

  {
    key: { event: 1 } },

  {
    key: { timestamp: 1 },
    name: 'eventTsIndex' }],


  tokenAddrCollection: [
  {
    key: {
      address: 1,
      contract: 1 },

    unique: true }] };
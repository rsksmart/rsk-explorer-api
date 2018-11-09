'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.default = {
  Blocks: [
  {
    key: { number: -1 },
    unique: true,
    name: 'blockNumber' },

  {
    key: { hash: 1 },
    unique: true },

  {
    key: { timestamp: -1 },
    name: 'blocksTimestamp' },

  {
    key: { miner: 1 },
    name: 'blocksMiner' },

  {
    key: { txs: 1 },
    name: 'blocksTxs' },

  {
    key: { size: 1 },
    name: 'blocksSize' },

  {
    key: { _received: -1 },
    name: 'blockReceivedTime' }],


  Txs: [
  {
    key: { hash: 1 },
    unique: true },

  {
    key: {
      blockNumber: -1,
      transactionIndex: -1 },

    name: 'blockTrasaction' },

  {
    key: { blockNumber: -1 },
    name: 'txBlockIndex' },

  {
    key: { from: 1 },
    name: 'fromIndex' },

  {
    key: { to: 1 },
    name: 'toIndex' },

  {
    key: { value: 1 },
    name: 'txValueIndex' },

  {
    key: { timestamp: 1 },
    name: 'timeIndex' },

  {
    key: { txType: 1 },
    name: 'txTypeIndex' }],


  Addrs: [
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


  Status: [
  {
    key: { timestamp: -1 },
    partialFilterExpression: {
      timestamp: { $exists: true } } }],



  Events: [
  {
    key: { address: 1 } },

  {
    key: { event: 1 } },

  {
    key: { timestamp: 1 },
    name: 'eventTsIndex' }],


  TokensAddrs: [
  {
    key: {
      address: 1,
      contract: 1 },

    unique: true }],


  OrphanBlocks: [
  {
    key: {
      hash: 1 },

    unique: true }],


  TxPool: [
  {
    key: {
      timestamp: -1 } }],



  PendingTxs: [
  {
    key: {
      hash: 1 },

    unique: true }] };
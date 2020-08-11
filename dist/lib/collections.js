"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _default = {
  Config: {
    indexes: [] },

  Blocks: {
    indexes: [
    {
      key: { number: -1 },
      unique: true,
      name: 'blockNumberIndex' },

    {
      key: { hash: 1 },
      unique: true,
      name: 'blockHashIndex' },

    {
      key: { timestamp: -1 },
      name: 'blocksTimestampIndex' },

    {
      key: { miner: 1 },
      name: 'blocksMinerIndex' },

    {
      key: { txs: 1 },
      name: 'blocksTxsIndex' },

    {
      key: { size: 1 },
      name: 'blocksSizeIndex' },

    {
      key: { _received: -1 },
      name: 'blockReceivedTimeIndex' }] },



  BlocksSummary: {
    indexes: [
    {
      key: { hash: 1 },
      unique: true,
      name: 'blockSummaryHashIndex' },

    {
      key: { number: -1 },
      name: 'blockSummaryNumberIndex' },

    {
      key: { timestamp: -1 },
      name: 'blockSummaryTimestampIndex' }] },



  Txs: {
    indexes: [
    {
      key: { txId: -1 },
      unique: true,
      name: 'txIdIndex' },

    {
      key: { hash: 1 },
      unique: true,
      name: 'txHashIndex' },

    {
      key: { blockNumber: -1 },
      name: 'txBlockNumberIndex' },

    {
      key: { transactionIndex: -1 },
      name: 'txIndex' },

    {
      key: { blockHash: 1 },
      name: 'txBlockHashIndex' },

    {
      key: { timestamp: -1 },
      name: 'txTimeIndex' },

    {
      key: { from: 1 },
      name: 'fromIndex' },

    {
      key: { to: 1 },
      name: 'toIndex' },

    {
      key: { txType: 1 },
      name: 'txTypeIndex' }] },



  Addrs: {
    indexes: [
    {
      key: { address: 1 },
      unique: true,
      name: 'addressAddressIndex' },

    {
      key: { balance: 1 },
      name: 'balanceIndex' },

    {
      key: { type: 1 },
      name: 'addTypeIndex' },

    {
      key: { name: 1 },
      name: 'addressNameIndex' },

    {
      key: { 'createdByTx.timestamp': -1 },
      name: 'contractCreatedIndex' },

    {
      key: { name: 'text' },
      name: 'addrTextIndex' }] },



  Status: {
    options: {
      capped: true,
      size: 262144,
      max: 100 },

    indexes: [
    {
      key: { timestamp: -1 },
      partialFilterExpression: {
        timestamp: { $exists: true } },

      name: 'statusKeyIndex' }] },



  Events: {
    indexes: [
    {
      key: { eventId: -1 },
      unique: true,
      name: 'eventIdIndex' },

    {
      key: { address: 1 },
      name: 'eventAddressIndex' },

    {
      key: { event: 1 },
      name: 'eventEvIndex' },

    {
      key: { timestamp: 1 },
      name: 'eventTsIndex' },

    {
      key: { blockNumber: 1 },
      name: 'eventBlockNumberIndex' },

    {
      key: { txHash: 1 },
      name: 'eventTxHashIndex' },

    {
      key: { blockHash: 1 },
      name: 'eventBlockHashIndex' },

    {
      key: { signature: 1 },
      name: 'eventSignatureIndex' },

    {
      key: { _addresses: 1 },
      name: 'eventAddressesIndex' }] },



  TokensAddrs: {
    indexes: [
    {
      key: {
        address: 1,
        contract: 1 },

      name: 'tokenAddressContractIndex',
      unique: true },

    {
      key: { address: 1 },
      name: 'addressIndx' },

    {
      key: { contract: 1 },
      name: 'contractIndx' }] },




  TxPool: {
    indexes: [
    {
      key: { timestamp: -1 },
      name: 'txPoolTimestampIndex' }] },



  PendingTxs: {
    indexes: [
    {
      key: {
        hash: 1 },

      name: 'pendingTxsHashIndex',
      unique: true },

    {
      key: { from: 1 },
      name: 'pendingTxFromIndex' },

    {
      key: { to: 1 },
      name: 'pendingTxToIndex' }] },



  Stats: {
    indexes: [
    {
      key: { timestamp: 1 },
      name: 'statsTimeIndex' },

    {
      key: { blockNumber: -1 },
      name: 'statsBlockNumberIndex' }] },



  ContractVerification: {
    indexes: [
    {
      key: { address: 1 },
      name: 'contractVerificationAddressIndex' }] },



  VerificationsResults: {
    indexes: [
    {
      key: { address: 1 },
      name: 'verificationsResultsAddressIndex' },

    {
      key: { match: 1 },
      name: 'verificationsResultsMatchIndex' }] },



  InternalTransactions: {
    indexes: [
    {
      key: { internalTxId: -1 },
      unique: true,
      name: 'internalTxIdIndex' },

    {
      key: { blockHash: 1 },
      name: 'internalTxsBlockHashIndex' },

    {
      key: { blockNumber: -1 },
      name: 'internalTxsBlockNumberIndex' },

    {
      key: { transactionHash: 1 },
      name: 'internalTxsTxHashIndex' },

    {
      key: { 'action.from': 1 },
      name: 'internalFromIndex' },

    {
      key: { 'action.to': 1 },
      name: 'internalTxsToIndex' },

    {
      key: { type: 1 },
      name: 'internalTxTypeIndex' }] },



  Balances: {
    indexes: [
    {
      key: {
        address: 1,
        blockNumber: -1 },

      unique: true,
      name: 'balancesBlockAddressIndex' },

    {
      key: { address: 1 },
      name: 'balancesAddressIndex' },

    {
      key: { blockNumber: -1 },
      name: 'balancesBlockNumberIndex' },

    {
      key: { blockHash: 1 },
      name: 'balancesBlockHashIndex' },

    {
      key: { timestamp: -1 },
      name: 'balacesTimestampIndex' }] },



  BalancesLog: {
    indexes: [
    {
      key: { blockHash: 1 },
      unique: true,
      name: 'balancesLogBlockHashIndex' }] },



  BlocksTraces: {
    indexes: [
    {
      key: { hash: 1 },
      unique: true,
      name: 'blockTracesHashIndex' }] } };exports.default = _default;
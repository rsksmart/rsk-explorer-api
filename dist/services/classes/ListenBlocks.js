'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.ListenBlocks = undefined;exports.




























































Blocks = Blocks;var _BlocksBase = require('../../lib/BlocksBase');class ListenBlocks extends _BlocksBase.BlocksBase {constructor(db, options) {super(db, options);this.Blocks = this.collections.Blocks;}async start() {try {let connected = await this.nod3.isConnected();if (!connected) {this.log.debug('nod3 is not connected');return this.start();} // remove all filters, node inclusive
      await this.nod3.subscribe.clear().catch(err => {this.log.debug(err);}); // syncing filter
      let syncing = await this.nod3.subscribe.method('eth.syncing');syncing.watch(sync => {let number = sync.currentBlock;if (number) {this.log.debug('[syncing] New Block reported:', number);this.requestBlock(number);}}, err => {this.log.debug(`Sync err: ${err}`);}); // new Block filter
      this.log.debug('Listen to blocks');let newBlock = await this.nod3.subscribe.filter('newBlock');newBlock.watch(blockHash => {this.log.debug('New Block reported:', blockHash);this.requestBlock(blockHash, true);}, err => {this.log.debug(`NewBlock error: ${err}`);});} catch (err) {this.log.debug(err);}}bulkRequest(args) {let action = this.actions.BULK_BLOCKS_REQUEST;process.send({ action, args: [args] });}requestBlock(key, prioritize) {let action = this.actions.BLOCK_REQUEST;process.send({ action, args: [key, prioritize] });}updateStatus(state) {let action = this.actions.STATUS_UPDATE;process.send({ action, args: [state] });}}exports.ListenBlocks = ListenBlocks;function Blocks(db, config) {return new ListenBlocks(db, config);}exports.default =
ListenBlocks;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Blocks = Blocks;exports.default = exports.ListenBlocks = void 0;var _BlocksBase = require("../../lib/BlocksBase");

class ListenBlocks extends _BlocksBase.BlocksBase {
  constructor(db, options, { emit }) {
    if (typeof emit !== 'function') throw new Error('Emit must be a function');
    super(db, options);
    this.Blocks = this.collections.Blocks;
    this.setEmitter(emit);
  }

  async start() {
    try {
      let connected = await this.nod3.isConnected();
      if (!connected) {
        this.log.debug('nod3 is not connected');
        return this.start();
      }
      // remove all filters, node inclusive
      await this.nod3.subscribe.clear().
      catch(err => {this.log.debug(err);});

      // syncing filter
      let syncing = await this.nod3.subscribe.method('eth.syncing');
      syncing.watch(sync => {
        let number = sync.currentBlock;
        if (number) {
          number = parseInt(number);
          this.log.debug('[syncing] New Block reported:', number);
          this.announceBlock(number);
        }
      }, err => {
        this.log.debug(`Sync err: ${err}`);
      });

      // new Block filter
      this.log.debug('Listen to blocks');
      let newBlock = await this.nod3.subscribe.filter('newBlock');
      newBlock.watch(blockHash => {
        this.log.debug('New Block reported:', blockHash);
        this.announceBlock(blockHash, true);
      }, err => {
        this.log.debug(`NewBlock error: ${err}`);
      });
    } catch (err) {
      this.log.debug(err);
    }
  }

  announceBlock(key, prioritize = false) {
    let event = this.events.NEW_BLOCK;
    this.emit(event, { key, prioritize });
  }}exports.ListenBlocks = ListenBlocks;


function Blocks(db, config) {
  return new ListenBlocks(db, config);
}var _default =

ListenBlocks;exports.default = _default;
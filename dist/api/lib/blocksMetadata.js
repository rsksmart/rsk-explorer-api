"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.addMetadataToBlocks = addMetadataToBlocks;exports.BLOCK_METADATA_FIELD = void 0;
var _utils = require("../../lib/utils");
const BLOCK_METADATA_FIELD = '_metadata';exports.BLOCK_METADATA_FIELD = BLOCK_METADATA_FIELD;

function addMetadataToBlocks(blocks) {
  if (!Array.isArray(blocks)) throw new Error(`blocks must be an array`);
  if (blocks.length < 2) return [];
  let newBlocks = blocks.slice(1);
  newBlocks = newBlocks.map((block, index) => {
    let prevBlock = blocks[index];
    if (prevBlock.number >= block.number) throw new Error('blocks must be in ascending order');
    let time = block.timestamp - prevBlock.timestamp;
    let txDensity = block.transactions.length / time;
    let { difficulty } = block;
    let blockHashrate = (0, _utils.newBigNumber)(difficulty).dividedBy((0, _utils.newBigNumber)(time));
    blockHashrate = (0, _utils.add0x)(blockHashrate.dp(0).toString(16));
    block[BLOCK_METADATA_FIELD] = { time, txDensity, blockHashrate };
    return block;
  });
  return newBlocks;
}
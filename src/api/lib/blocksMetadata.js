
import { newBigNumber } from '../../lib/utils'
import { add0x } from '@rsksmart/rsk-utils'
export const BLOCK_METADATA_FIELD = '_metadata'

export function addMetadataToBlocks (blocks) {
  if (!Array.isArray(blocks)) throw new Error(`blocks must be an array`)
  if (blocks.length < 2) return []
  let newBlocks = blocks.slice(1)
  newBlocks = newBlocks.map((block, index) => {
    let prevBlock = blocks[index]
    if (prevBlock.number >= block.number) throw new Error('blocks must be in ascending order')
    let time = block.timestamp - prevBlock.timestamp
    let txDensity = block.transactions.length / time
    let { difficulty } = block
    let blockHashrate = newBigNumber(difficulty).dividedBy(newBigNumber(time))
    blockHashrate = add0x(blockHashrate.dp(0).toString(16))
    block[BLOCK_METADATA_FIELD] = { time, txDensity, blockHashrate }
    return block
  })
  return newBlocks
}

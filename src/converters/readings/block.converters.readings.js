function blockEntityToRaw(blockEntity) {
  blockEntity['_received'] = Number(blockEntity.received)
  delete blockEntity['received']

  blockEntity['timestamp'] = Number(blockEntity['timestamp'])

  blockEntity.uncles = blockEntity.uncle.map(uncleObj => uncleObj.hash)
  delete blockEntity['uncle']

  return blockEntity
}

export {blockEntityToRaw}
 
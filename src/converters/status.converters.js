function rawStatusToEntity ({
  pendingBlocks,
  requestingBlocks,
  nodeDown,
  timestamp
}) {
  return {
    pendingBlocks,
    requestingBlocks,
    nodeDown,
    timestamp
  }
}

function statusEntityToRaw ({
  pendingBlocks,
  requestingBlocks,
  nodeDown,
  timestamp
}) {
  return {
    pendingBlocks,
    requestingBlocks,
    nodeDown,
    timestamp: Number(timestamp)
  }
}

export { rawStatusToEntity, statusEntityToRaw }

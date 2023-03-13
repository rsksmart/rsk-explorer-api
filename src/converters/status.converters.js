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

export { rawStatusToEntity }

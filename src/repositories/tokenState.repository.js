export function getTokenStateRepository (prismaClient) {
  return {
    insertStatements (newBlock, tokenStates) {
      if (!tokenStates.length) return []
      const statesInContractOrder = [...tokenStates].sort((a, b) => a.contract < b.contract ? -1 : 1)

      return [
        ...statesInContractOrder.flatMap(({ contract, ...state }) => [
          prismaClient.token.upsert({
            where: { contract },
            create: { contract, blockNumber: newBlock.number, ...state },
            update: { version: { increment: 1 } }
          }),
          prismaClient.token.updateMany({
            where: { contract, blockNumber: { lt: newBlock.number } },
            data: { blockNumber: newBlock.number, ...state }
          })
        ]),
        prismaClient.token_state_at_block.createMany({ data: statesInContractOrder.map(state => ({ ...state, blockNumber: newBlock.number })) })
      ]
    },
    async undoStatements (blocksToDelete) {
      const deletedBlockNumbers = blocksToDelete.map(b => b.number)
      const statesOfDeletedBlocks = await prismaClient.token_state_at_block.findMany({ where: { blockNumber: { in: deletedBlockNumbers } }, select: { contract: true } })
      if (!statesOfDeletedBlocks.length) return []
      const contracts = [...new Set(statesOfDeletedBlocks.map(state => state.contract))].sort()

      const tokensAtDeletedBlocks = await prismaClient.token.findMany({
        where: { contract: { in: contracts }, blockNumber: { in: deletedBlockNumbers } },
        select: { contract: true, version: true },
        orderBy: { contract: 'asc' }
      })
      const tokenRepairs = []

      for (const { contract, version } of tokensAtDeletedBlocks) {
        const newestRemainingState = await prismaClient.token_state_at_block.findFirst({
          where: { contract, blockNumber: { notIn: deletedBlockNumbers } },
          orderBy: { blockNumber: 'desc' }
        })
        const where = { contract, version }

        if (newestRemainingState) {
          const { contract: _, ...state } = newestRemainingState
          tokenRepairs.push(prismaClient.token.update({ where, data: state }))
        } else {
          tokenRepairs.push(prismaClient.token.delete({ where }))
        }
      }

      return [...tokenRepairs, prismaClient.token_state_at_block.deleteMany({ where: { blockNumber: { in: deletedBlockNumbers } } })]
    }
  }
}

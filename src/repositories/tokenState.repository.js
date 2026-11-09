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
        prismaClient.token_state_at_block.createMany({
          data: statesInContractOrder.map(state => ({ ...state, blockNumber: newBlock.number }))
        })
      ]
    },
    async undoStatements (blocksToDelete) {
      const deletedBlockNumbers = blocksToDelete.map(block => block.number)
      const statesOfDeletedBlocks = await prismaClient.token_state_at_block.findMany({
        where: { blockNumber: { in: deletedBlockNumbers } },
        select: { contract: true }
      })
      if (!statesOfDeletedBlocks.length) return []
      const contractsInLockOrder = [...new Set(statesOfDeletedBlocks.map(state => state.contract))].sort()

      const tokensAtDeletedBlocks = await prismaClient.token.findMany({
        where: { contract: { in: contractsInLockOrder }, blockNumber: { in: deletedBlockNumbers } },
        select: { contract: true, version: true },
        orderBy: { contract: 'asc' }
      })
      const versionOfTokenAtADeletedBlock = new Map(
        tokensAtDeletedBlocks.map(({ contract, version }) => [contract, version])
      )
      const tokenWrites = []

      for (const contract of contractsInLockOrder) {
        if (!versionOfTokenAtADeletedBlock.has(contract)) {
          tokenWrites.push(prismaClient.token.updateMany({ where: { contract }, data: { version: { increment: 1 } } }))
          continue
        }

        const newestRemainingState = await prismaClient.token_state_at_block.findFirst({
          where: { contract, blockNumber: { notIn: deletedBlockNumbers } },
          orderBy: { blockNumber: 'desc' }
        })
        const where = { contract, version: versionOfTokenAtADeletedBlock.get(contract) }

        if (newestRemainingState) {
          const { contract: _, ...state } = newestRemainingState
          tokenWrites.push(prismaClient.token.update({ where, data: { ...state, version: { increment: 1 } } }))
        } else {
          tokenWrites.push(prismaClient.token.delete({ where }))
        }
      }

      return [
        ...tokenWrites,
        prismaClient.token_state_at_block.deleteMany({ where: { blockNumber: { in: deletedBlockNumbers } } })
      ]
    }
  }
}

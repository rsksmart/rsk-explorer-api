export function getTokenStateRepository (prismaClient) {
  return {
    insertStatements (block, tokenStates) {
      if (!tokenStates.length) return []
      const states = [...tokenStates].sort((a, b) => a.contract < b.contract ? -1 : 1)

      return [
        ...states.flatMap(({ contract, ...state }) => [
          prismaClient.token.upsert({
            where: { contract },
            create: { contract, blockNumber: block.number, ...state },
            update: { version: { increment: 1 } }
          }),
          prismaClient.token.updateMany({
            where: { contract, blockNumber: { lt: block.number } },
            data: { blockNumber: block.number, ...state }
          })
        ]),
        prismaClient.token_state_at_block.createMany({ data: states.map(state => ({ ...state, blockNumber: block.number })) })
      ]
    },
    async undoStatements (blocks) {
      const numbers = blocks.map(b => b.number)
      const facts = await prismaClient.token_state_at_block.findMany({ where: { blockNumber: { in: numbers } }, select: { contract: true } })
      if (!facts.length) return []
      const contracts = [...new Set(facts.map(f => f.contract))].sort()

      const rows = await prismaClient.token.findMany({
        where: { contract: { in: contracts }, blockNumber: { in: numbers } },
        select: { contract: true, version: true },
        orderBy: { contract: 'asc' }
      })
      const statements = []

      for (const { contract, version } of rows) {
        const newestRemainingState = await prismaClient.token_state_at_block.findFirst({
          where: { contract, blockNumber: { notIn: numbers } },
          orderBy: { blockNumber: 'desc' }
        })
        const where = { contract, version }

        if (newestRemainingState) {
          const { contract: _, ...state } = newestRemainingState
          statements.push(prismaClient.token.update({ where, data: state }))
        } else {
          statements.push(prismaClient.token.delete({ where }))
        }
      }

      return [...statements, prismaClient.token_state_at_block.deleteMany({ where: { blockNumber: { in: numbers } } })]
    }
  }
}

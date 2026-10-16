export function getTokenStateRepository (prismaClient) {
  async function latestOtherStates (contracts, doomedNumbers) {
    if (!contracts.length) return new Map()
    const maxima = await prismaClient.token_state_at_block.groupBy({
      by: ['contract'],
      where: { contract: { in: contracts }, blockNumber: { notIn: doomedNumbers } },
      _max: { blockNumber: true }
    })
    if (!maxima.length) return new Map()
    const states = await prismaClient.token_state_at_block.findMany({
      where: { OR: maxima.map(row => ({ contract: row.contract, blockNumber: row._max.blockNumber })) }
    })

    return new Map(states.map(state => [state.contract, state]))
  }

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
      const latest = await latestOtherStates(rows.map(r => r.contract), numbers)
      const statements = rows.map(({ contract, version }) => {
        const where = { contract, version }
        if (!latest.has(contract)) return prismaClient.token.delete({ where })
        const { contract: _, ...state } = latest.get(contract)
        return prismaClient.token.update({ where, data: state })
      })

      return [...statements, prismaClient.token_state_at_block.deleteMany({ where: { blockNumber: { in: numbers } } })]
    }
  }
}

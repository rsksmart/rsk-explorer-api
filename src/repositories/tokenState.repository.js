const LATEST_STATE_READ_ATTEMPTS = 3

export function getTokenStateRepository (prismaClient) {
  async function latestOtherStates (contracts, doomedNumbers) {
    for (let attempt = 1; contracts.length; attempt++) {
      const maxima = await prismaClient.token_state_at_block.groupBy({
        by: ['contract'],
        where: { contract: { in: contracts }, blockNumber: { notIn: doomedNumbers } },
        _max: { blockNumber: true }
      })
      if (!maxima.length) break
      const states = await prismaClient.token_state_at_block.findMany({
        where: { OR: maxima.map(row => ({ contract: row.contract, blockNumber: row._max.blockNumber })) }
      })
      if (states.length === maxima.length) return new Map(states.map(state => [state.contract, state]))
      if (attempt === LATEST_STATE_READ_ATTEMPTS) {
        throw new Error(`the newest token state facts of ${maxima.length - states.length} contract(s) were deleted between their two reads on each of ${attempt} attempts`)
      }
    }

    return new Map()
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

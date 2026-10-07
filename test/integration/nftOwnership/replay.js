import { prismaClient } from '../../../src/lib/prismaClient'
import { TRANSFER_TOPIC, TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC, ZERO_ADDRESS } from '../../../src/lib/nftTransfers'
import { tokenStateAt } from './fixtures'

const TABLES = ['nft_balance', 'nft_holder', 'token_transfer', 'token_state_at_block', 'token', 'token_address_in_summary', 'token_address',
  'address_in_summary', 'event_in_summary', 'transaction_in_summary', 'block_summary', 'address_latest_balance', 'address_in_event', 'event',
  'receipt', 'transaction', 'block_trace', 'balance', 'miner_address', 'block', 'address']

export const integrationDescribe = /_test$/.test(new URL(process.env.DATABASE_URL || 'postgresql://x/none').pathname) ? describe : describe.skip

export async function resetDatabase () {
  await prismaClient.$executeRawUnsafe(`TRUNCATE ${TABLES.join(', ')} CASCADE`)
}

const word = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
const topicToAddress = topic => `0x${topic.slice(-40)}`.toLowerCase()
const later = (a, b) => a.blockNumber !== b.blockNumber ? a.blockNumber > b.blockNumber
  : a.transactionIndex !== b.transactionIndex ? a.transactionIndex > b.transactionIndex : a.logIndex > b.logIndex

function legsOf (event) {
  if (event.topic0 === TRANSFER_TOPIC && event.topic3) {
    return [{ standard: 'ERC721', tokenId: event.topic3.toLowerCase(), value: 1n, from: topicToAddress(event.topic1), to: topicToAddress(event.topic2) }]
  }
  if ((event.topic0 !== TRANSFER_SINGLE_TOPIC && event.topic0 !== TRANSFER_BATCH_TOPIC) || !event.topic3) return []
  const args = JSON.parse(event.args)
  const from = topicToAddress(event.topic2)
  const to = topicToAddress(event.topic3)
  const ids = event.topic0 === TRANSFER_SINGLE_TOPIC ? [args[3]] : args[3]
  const values = event.topic0 === TRANSFER_SINGLE_TOPIC ? [args[4]] : args[4]
  return ids.flatMap((id, i) => values[i] === undefined ? [] : [{ standard: 'ERC1155', tokenId: word(BigInt(id).toString(16)), value: BigInt(values[i]), from, to }])
}

export async function replay ({ tokenState = tokenStateAt, eventWhere = {} } = {}) {
  const events = await prismaClient.event.findMany({ where: eventWhere })
  const facts = new Map()
  const amounts = new Map()
  const holders = new Map()
  const triggers = new Map()

  for (const event of events) {
    for (const leg of legsOf(event)) {
      const contract = event.address.toLowerCase()
      const factKey = `${event.eventId}|${leg.tokenId}`
      facts.set(factKey, ((facts.get(factKey) || 0n) + leg.value))
      const blocks = triggers.get(contract) || triggers.set(contract, new Set()).get(contract)
      blocks.add(event.blockNumber)
      for (const [holder, value] of [[leg.to, leg.value], [leg.from, -leg.value]]) {
        if (holder === ZERO_ADDRESS) continue
        const key = `${contract}|${leg.standard}|${holder}`
        const balanceKey = `${contract}|${leg.standard}|${leg.tokenId}|${holder}`
        amounts.set(balanceKey, (amounts.get(balanceKey) || 0n) + value)
        const seen = holders.get(key)
        if (!seen || later(event, seen)) holders.set(key, event)
      }
    }
  }

  const balances = new Map([...amounts].filter(([, v]) => v !== 0n).map(([k, v]) => [k, v.toString()]))
  const perHolder = new Map([...holders.keys()].map(k => [k, { quantity: 0n, count: 0 }]))
  for (const [key, value] of balances) {
    const [contract, standard, , holder] = key.split('|')
    const h = perHolder.get(`${contract}|${standard}|${holder}`)
    h.quantity += BigInt(value)
    if (BigInt(value) > 0n) h.count++
  }
  const holderRows = new Map([...perHolder].map(([key, { quantity, count }]) => {
    const last = holders.get(key)
    const shown = key.split('|')[1] === 'ERC721' ? BigInt(count) : quantity
    return [key, `${shown}/${count}@${last.blockNumber}/${last.blockHash}`]
  }))

  const tokens = new Map()
  const states = new Map()
  for (const [contract, blocks] of triggers) {
    const latest = Math.max(...blocks)
    const { contract: _, ...state } = tokenState(contract, latest)
    tokens.set(contract, JSON.stringify({ blockNumber: latest, ...state }))
    for (const number of blocks) {
      const { contract: __, ...atBlock } = tokenState(contract, number)
      states.set(`${contract}|${number}`, JSON.stringify(atBlock))
    }
  }

  return { facts: new Map([...facts].map(([k, v]) => [k, v.toString()])), balances, holders: holderRows, tokens, states }
}

export async function tableState () {
  const facts = new Map((await prismaClient.token_transfer.findMany()).map(f => [`${f.eventId}|${f.tokenId}`, f.value.toFixed()]))
  const balances = new Map((await prismaClient.nft_balance.findMany({ where: { quantity: { not: 0 } } })).map(b => [`${b.contract}|${b.standard}|${b.tokenId}|${b.holder}`, b.quantity.toFixed()]))
  const holders = new Map((await prismaClient.nft_holder.findMany()).map(h => [`${h.contract}|${h.standard}|${h.holder}`, `${h.quantity.toFixed()}/${h.tokenCount}@${h.lastBlockNumber}/${h.lastBlockHash}`]))
  const tokens = new Map((await prismaClient.token.findMany()).map(({ contract, version, totalSupply, ...rest }) => [contract, JSON.stringify({
    blockNumber: rest.blockNumber, interfaces: rest.interfaces, isFungible: rest.isFungible, isNft: rest.isNft, proxyType: rest.proxyType,
    implementation: rest.implementation, name: rest.name, symbol: rest.symbol, decimals: rest.decimals, totalSupply: totalSupply === null ? null : totalSupply.toFixed()
  })]))
  const states = new Map((await prismaClient.token_state_at_block.findMany()).map(({ contract, blockNumber, totalSupply, ...rest }) => [`${contract}|${blockNumber}`, JSON.stringify({
    interfaces: rest.interfaces, isFungible: rest.isFungible, isNft: rest.isNft, proxyType: rest.proxyType, implementation: rest.implementation,
    name: rest.name, symbol: rest.symbol, decimals: rest.decimals, totalSupply: totalSupply === null ? null : totalSupply.toFixed()
  })]))
  const zeroRows = await prismaClient.nft_balance.count({ where: { quantity: 0 } })
  return { facts, balances, holders, tokens, states, zeroRows }
}

export async function differences (options) {
  const [expected, actual] = await Promise.all([replay(options), tableState()])
  const diffs = []
  for (const part of ['facts', 'balances', 'holders', 'tokens', 'states']) {
    for (const key of new Set([...expected[part].keys(), ...actual[part].keys()])) {
      if (expected[part].get(key) !== actual[part].get(key)) diffs.push(`${part} ${key}: replay=${expected[part].get(key)} table=${actual[part].get(key)}`)
    }
  }
  if (actual.zeroRows) diffs.push(`zero balance rows left: ${actual.zeroRows}`)
  return diffs
}

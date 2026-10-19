import { prismaClient } from '../../../src/lib/prismaClient'
import {
  TRANSFER_TOPIC,
  TRANSFER_SINGLE_TOPIC,
  TRANSFER_BATCH_TOPIC,
  ZERO_ADDRESS
} from '../../../src/lib/nftTransfers'
import { tokenStateAt } from './fixtures'

const NFT_TABLES = ['nft_balance', 'nft_holder', 'token_transfer', 'token_state_at_block', 'token']
const TABLES_CHILDREN_FIRST = [
  ...NFT_TABLES,
  'token_address_in_summary',
  'token_address',
  'address_in_summary',
  'event_in_summary',
  'transaction_in_summary',
  'block_summary',
  'address_latest_balance',
  'address_in_event',
  'event',
  'receipt',
  'transaction',
  'block_trace',
  'balance',
  'miner_address',
  'block',
  'address'
]

export const integrationDescribe = /_test$/.test(new URL(process.env.DATABASE_URL || 'postgresql://x/none').pathname)
  ? describe
  : describe.skip

export async function resetDatabase ({ keepBlocksAndEvents = false } = {}) {
  for (const table of keepBlocksAndEvents ? NFT_TABLES : TABLES_CHILDREN_FIRST) await prismaClient[table].deleteMany({})
}

const padTo32Bytes = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
const topicToAddress = topic => `0x${topic.slice(-40)}`.toLowerCase()

function isLaterEvent (event, other) {
  if (event.blockNumber !== other.blockNumber) return event.blockNumber > other.blockNumber
  if (event.transactionIndex !== other.transactionIndex) return event.transactionIndex > other.transactionIndex
  return event.logIndex > other.logIndex
}

function movesOf (event) {
  if (event.topic0 === TRANSFER_TOPIC && event.topic3) {
    return [{
      standard: 'ERC721',
      tokenId: event.topic3.toLowerCase(),
      quantity: 1n,
      from: topicToAddress(event.topic1),
      to: topicToAddress(event.topic2)
    }]
  }
  if ((event.topic0 !== TRANSFER_SINGLE_TOPIC && event.topic0 !== TRANSFER_BATCH_TOPIC) || !event.topic3) return []
  const args = JSON.parse(event.args)
  const from = topicToAddress(event.topic2)
  const to = topicToAddress(event.topic3)
  const isSingle = event.topic0 === TRANSFER_SINGLE_TOPIC
  const tokenIds = isSingle ? [args[3]] : args[3]
  const quantities = isSingle ? [args[4]] : args[4]
  const moves = []
  for (let i = 0; i < tokenIds.length; i++) {
    if (quantities[i] === undefined) continue
    moves.push({
      standard: 'ERC1155',
      tokenId: padTo32Bytes(BigInt(tokenIds[i]).toString(16)),
      quantity: BigInt(quantities[i]),
      from,
      to
    })
  }
  return moves
}

function withoutContract (state) {
  const copy = { ...state }
  delete copy.contract
  return copy
}

export async function replay ({ tokenState = tokenStateAt, eventWhere = {} } = {}) {
  const events = await prismaClient.event.findMany({ where: eventWhere })
  const factQuantities = new Map()
  const balanceQuantities = new Map()
  const lastEventByHolder = new Map()
  const blocksByContract = new Map()

  for (const event of events) {
    for (const move of movesOf(event)) {
      const contract = event.address.toLowerCase()
      const factKey = `${event.eventId}|${move.tokenId}`
      factQuantities.set(factKey, (factQuantities.get(factKey) || 0n) + move.quantity)
      if (!blocksByContract.has(contract)) blocksByContract.set(contract, new Set())
      blocksByContract.get(contract).add(event.blockNumber)
      for (const [holder, change] of [[move.to, move.quantity], [move.from, -move.quantity]]) {
        if (holder === ZERO_ADDRESS) continue
        const holderKey = `${contract}|${move.standard}|${holder}`
        const balanceKey = `${contract}|${move.standard}|${move.tokenId}|${holder}`
        balanceQuantities.set(balanceKey, (balanceQuantities.get(balanceKey) || 0n) + change)
        const lastEvent = lastEventByHolder.get(holderKey)
        if (!lastEvent || isLaterEvent(event, lastEvent)) lastEventByHolder.set(holderKey, event)
      }
    }
  }

  const balances = new Map([...balanceQuantities]
    .filter(([, quantity]) => quantity !== 0n)
    .map(([key, quantity]) => [key, quantity.toString()]))
  const totalsByHolder = new Map([...lastEventByHolder.keys()]
    .map(holderKey => [holderKey, { quantity: 0n, tokenCount: 0 }]))
  for (const [balanceKey, quantity] of balances) {
    const [contract, standard, , holder] = balanceKey.split('|')
    const totals = totalsByHolder.get(`${contract}|${standard}|${holder}`)
    totals.quantity += BigInt(quantity)
    if (BigInt(quantity) > 0n) totals.tokenCount++
  }
  const holders = new Map([...totalsByHolder].map(([holderKey, { quantity, tokenCount }]) => {
    const lastEvent = lastEventByHolder.get(holderKey)
    const isErc721 = holderKey.split('|')[1] === 'ERC721'
    const shownQuantity = isErc721 ? BigInt(tokenCount) : quantity
    return [holderKey, `${shownQuantity}/${tokenCount}@${lastEvent.blockNumber}/${lastEvent.blockHash}`]
  }))

  const tokens = new Map()
  const states = new Map()
  for (const [contract, blockNumbers] of blocksByContract) {
    const latestBlock = Math.max(...blockNumbers)
    tokens.set(contract, JSON.stringify({
      blockNumber: latestBlock,
      ...withoutContract(tokenState(contract, latestBlock))
    }))
    for (const blockNumber of blockNumbers) {
      states.set(`${contract}|${blockNumber}`, JSON.stringify(withoutContract(tokenState(contract, blockNumber))))
    }
  }

  const facts = new Map([...factQuantities].map(([key, quantity]) => [key, quantity.toString()]))
  return { facts, balances, holders, tokens, states }
}

export async function tableState () {
  const facts = new Map((await prismaClient.token_transfer.findMany()).map(fact => [
    `${fact.eventId}|${fact.tokenId}`,
    fact.value.toFixed()
  ]))
  const balances = new Map((await prismaClient.nft_balance.findMany({ where: { quantity: { not: 0 } } })).map(balance => [
    `${balance.contract}|${balance.standard}|${balance.tokenId}|${balance.holder}`,
    balance.quantity.toFixed()
  ]))
  const holders = new Map((await prismaClient.nft_holder.findMany()).map(holder => [
    `${holder.contract}|${holder.standard}|${holder.holder}`,
    `${holder.quantity.toFixed()}/${holder.tokenCount}@${holder.lastBlockNumber}/${holder.lastBlockHash}`
  ]))
  const tokens = new Map((await prismaClient.token.findMany()).map(({ contract, version, totalSupply, ...rest }) => [
    contract,
    JSON.stringify({
      blockNumber: rest.blockNumber,
      interfaces: rest.interfaces,
      isFungible: rest.isFungible,
      isNft: rest.isNft,
      proxyType: rest.proxyType,
      implementation: rest.implementation,
      name: rest.name,
      symbol: rest.symbol,
      decimals: rest.decimals,
      totalSupply: totalSupply === null ? null : totalSupply.toFixed()
    })
  ]))
  const states = new Map((await prismaClient.token_state_at_block.findMany()).map(({ contract, blockNumber, totalSupply, ...rest }) => [
    `${contract}|${blockNumber}`,
    JSON.stringify({
      interfaces: rest.interfaces,
      isFungible: rest.isFungible,
      isNft: rest.isNft,
      proxyType: rest.proxyType,
      implementation: rest.implementation,
      name: rest.name,
      symbol: rest.symbol,
      decimals: rest.decimals,
      totalSupply: totalSupply === null ? null : totalSupply.toFixed()
    })
  ]))
  const zeroRows = await prismaClient.nft_balance.count({ where: { quantity: 0 } })
  return { facts, balances, holders, tokens, states, zeroRows }
}

export async function differences (options) {
  const [expected, actual] = await Promise.all([replay(options), tableState()])
  const found = []
  for (const table of ['facts', 'balances', 'holders', 'tokens', 'states']) {
    for (const key of new Set([...expected[table].keys(), ...actual[table].keys()])) {
      if (expected[table].get(key) !== actual[table].get(key)) {
        found.push(`${table} ${key}: replay=${expected[table].get(key)} table=${actual[table].get(key)}`)
      }
    }
  }
  if (actual.zeroRows) found.push(`zero balance rows left: ${actual.zeroRows}`)
  return found
}

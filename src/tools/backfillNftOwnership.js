import { prismaClient as defaultPrismaClient } from '../lib/prismaClient'
import { nftRepository, tokenStateRepository, configRepository } from '../repositories'
import { TRANSFER_TOPIC, TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC, NFT_STANDARDS } from '../lib/nftTransfers'
import nod3 from '../lib/nod3Connect'
import { TokenState } from '../services/classes/TokenState'
import { EXPLORER_INITIAL_CONFIG_ID } from '../lib/defaultConfig'
import { exitOnUncaughtException } from './utils'

const toolName = process.argv[1].split('/').pop()

const READ_COMMITTED = { isolationLevel: 'ReadCommitted' }
const RACED_WRITE_ERRORS = ['P2002', 'P2003', 'P2025']
const WRITE_ATTEMPTS = 3
const WHOLE_NUMBER = /^\d+$/
const NFT_TRANSFER_EVENTS = {
  OR: [
    { topic0: TRANSFER_TOPIC, topic3: { not: null } },
    { topic0: { in: [TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC] } }
  ]
}
const EVENT_FIELDS = { eventId: true, address: true, blockNumber: true, blockHash: true, transactionHash: true, timestamp: true, topic0: true, topic1: true, topic2: true, topic3: true, data: true }

const newReport = phase => phase === 'A'
  ? { blocksRead: 0, blocksWritten: 0, blocksAlreadyStored: 0, blocksRaced: 0, facts: 0 }
  : { blocksRead: 0, pairs: 0, pairsAlreadyStored: 0, pairsWritten: 0, pairsFailed: [], pairsRaced: 0 }

const toRawEvent = ({ topic0, topic1, topic2, topic3, ...event }) => ({ ...event, topics: [topic0, topic1, topic2, topic3].filter(topic => topic !== null) })
const isRacedWrite = error => !!error && RACED_WRITE_ERRORS.includes(error.code)
const pinUnreplaced = (prismaClient, { number, hash }) => prismaClient.block.update({ where: { number, hash }, data: { hash }, select: { number: true } })

async function writtenOrDeletedMeanwhile (prismaClient, { hash }) {
  const [stored, facts] = await Promise.all([
    prismaClient.block.findUnique({ where: { hash }, select: { number: true } }),
    prismaClient.token_transfer.findFirst({ where: { blockHash: hash, standard: { in: NFT_STANDARDS } }, select: { eventId: true } })
  ])
  return !stored || !!facts
}

async function nextBlocks (prismaClient, cursor, toBlock, chunkBlocks) {
  return prismaClient.block.findMany({
    where: { number: { gte: cursor, lte: toBlock } },
    select: { number: true, hash: true },
    orderBy: { number: 'asc' },
    take: chunkBlocks
  })
}

async function eachChunk ({ prismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone }, processChunk) {
  let cursor = fromBlock
  for (;;) {
    const blocks = await nextBlocks(prismaClient, cursor, toBlock, chunkBlocks)
    if (!blocks.length) return
    await processChunk(blocks)
    cursor = blocks[blocks.length - 1].number + 1
    onChunkDone({ firstBlock: blocks[0].number, lastBlock: cursor - 1 })
  }
}

export async function backfillTransfers ({ prismaClient = defaultPrismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone = () => {}, report = newReport('A') }) {
  const writeTransfers = async (block, events) => {
    for (let attempt = 1; ; attempt++) {
      const statements = await nftRepository.insertStatements(block, events)
      if (!statements.length) return
      try {
        const [{ count }] = await prismaClient.$transaction(statements, READ_COMMITTED)
        report.blocksWritten++
        report.facts += count
        return
      } catch (error) {
        if (!isRacedWrite(error)) throw error
        if (await writtenOrDeletedMeanwhile(prismaClient, block)) {
          report.blocksRaced++
          console.log(`block ${block.number} ${block.hash}: ${error.code}, deleted or written by another writer meanwhile. Skipped.`)
          return
        }
        if (attempt === WRITE_ATTEMPTS) throw error
        console.log(`block ${block.number} ${block.hash}: ${error.code} on attempt ${attempt}, a holder changed since it was read. Reading again`)
      }
    }
  }

  await eachChunk({ prismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone }, async blocks => {
    report.blocksRead += blocks.length
    const events = await prismaClient.event.findMany({
      where: { blockHash: { in: blocks.map(b => b.hash) }, ...NFT_TRANSFER_EVENTS },
      select: EVENT_FIELDS,
      orderBy: { eventId: 'asc' }
    })
    if (!events.length) return

    const eventsByBlock = new Map()
    for (const event of events) {
      if (!eventsByBlock.has(event.blockHash)) eventsByBlock.set(event.blockHash, [])
      eventsByBlock.get(event.blockHash).push(toRawEvent(event))
    }

    const stored = await prismaClient.token_transfer.groupBy({
      by: ['blockHash'],
      where: { blockHash: { in: [...eventsByBlock.keys()] }, standard: { in: NFT_STANDARDS } }
    })
    const storedHashes = new Set(stored.map(s => s.blockHash))

    for (const block of blocks.filter(b => eventsByBlock.has(b.hash))) {
      if (storedHashes.has(block.hash)) {
        report.blocksAlreadyStored++
        continue
      }
      await writeTransfers(block, eventsByBlock.get(block.hash))
    }
  })

  return report
}

async function fetchPairs (fetchers, pairs, onFetched) {
  const queue = [...pairs]
  await Promise.all(fetchers.map(async fetcher => {
    while (queue.length) {
      const pair = queue.shift()
      try {
        onFetched(pair, { state: await fetcher.fetchOne(pair.contract, pair.blockNumber) })
      } catch (failure) {
        onFetched(pair, { failure })
      }
    }
  }))
}

export async function backfillTokenStates ({ prismaClient = defaultPrismaClient, fromBlock, toBlock, chunkBlocks, fetchers, onChunkDone = () => {}, report = newReport('B') }) {
  const states = new Map()
  const pairKey = ({ contract, blockNumber, blockHash }) => `${contract}|${blockNumber}|${blockHash}`

  const pendingPairs = async hashes => {
    const pairs = await prismaClient.token_transfer.groupBy({
      by: ['contract', 'blockNumber', 'blockHash'],
      where: { blockHash: { in: hashes }, standard: { in: NFT_STANDARDS } },
      orderBy: [{ blockNumber: 'asc' }, { contract: 'asc' }]
    })
    if (!pairs.length) return { pairs, todo: [] }
    const stored = await prismaClient.token_state_at_block.findMany({
      where: { blockNumber: { in: [...new Set(pairs.map(p => p.blockNumber))] } },
      select: { contract: true, blockNumber: true }
    })
    const storedKeys = new Set(stored.map(s => `${s.contract}|${s.blockNumber}`))
    return { pairs, todo: pairs.filter(p => !storedKeys.has(`${p.contract}|${p.blockNumber}`)) }
  }

  const recordFetch = (pair, { state, failure }) => {
    if (failure) {
      report.pairsFailed.push({ ...pair, failure: failure.message })
      console.log(`pair ${pair.contract} at ${pair.blockNumber}: ${failure.message}. Not stored; a rerun retries it.`)
      return
    }
    states.set(pairKey(pair), state)
  }

  const writeBlock = async (block, planned) => {
    let todo = planned
    for (let attempt = 1; todo.length; attempt++) {
      if (attempt > 1) await fetchPairs(fetchers, todo.filter(pair => !states.has(pairKey(pair))), recordFetch)
      const fetched = todo.map(pair => states.get(pairKey(pair))).filter(Boolean)
      if (!fetched.length) return
      try {
        await prismaClient.$transaction([pinUnreplaced(prismaClient, block), ...tokenStateRepository.insertStatements(block, fetched)], READ_COMMITTED)
        report.pairsWritten += fetched.length
        return
      } catch (error) {
        if (attempt === WRITE_ATTEMPTS || !isRacedWrite(error)) throw error
        report.pairsRaced++
        console.log(`block ${block.number} ${block.hash}: ${error.code} on attempt ${attempt}, reading its pairs again`)
        todo = (await pendingPairs([block.hash])).todo
      }
    }
  }

  await eachChunk({ prismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone }, async blocks => {
    report.blocksRead += blocks.length
    const { pairs, todo } = await pendingPairs(blocks.map(b => b.hash))
    report.pairs += pairs.length
    report.pairsAlreadyStored += pairs.length - todo.length

    await fetchPairs(fetchers, todo.filter(pair => !states.has(pairKey(pair))), recordFetch)

    for (const block of blocks) {
      const planned = todo.filter(pair => pair.blockHash === block.hash)
      if (planned.length) await writeBlock(block, planned)
    }
    for (const pair of todo) states.delete(pairKey(pair))
  })

  return report
}

export async function runPhase ({ prismaClient = defaultPrismaClient, phase, fromArg, toArg, chunkBlocks = 1000, fetchers, report = newReport(phase) }) {
  const fromBlock = fromArg !== undefined ? fromArg : 0
  const highest = await prismaClient.block.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
  const toBlock = toArg !== undefined ? toArg : (highest ? highest.number : -1)
  if (fromArg !== undefined && fromBlock > toBlock) {
    throw new Error(`fromBlock ${fromBlock} is above toBlock ${toBlock}${toArg === undefined ? ' (the highest stored block)' : ''}: the range is empty`)
  }
  const started = Date.now()

  console.log(`${toolName} phase ${phase}: blocks ${fromBlock}..${toBlock}, ${chunkBlocks} stored blocks per chunk`)
  const onChunkDone = ({ firstBlock, lastBlock }) => console.log(`chunk ${firstBlock}..${lastBlock} done · ${Math.round((Date.now() - started) / 1000)} s`)

  await (phase === 'A'
    ? backfillTransfers({ prismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone, report })
    : backfillTokenStates({ prismaClient, fromBlock, toBlock, chunkBlocks, fetchers, onChunkDone, report }))

  console.log(`Done in ${Date.now() - started} ms: ${JSON.stringify(report)}`)
  return report
}

export const exitCodeOf = report => report.pairsFailed && report.pairsFailed.length ? 1 : 0

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName} phase(A: transfers and ownership from event | B: token state at each transfer block, reads the node) fromBlock(optional, default 0) toBlock(optional; default: the highest stored block) chunkBlocks(optional, default 1000) concurrency(optional, phase B node readers, default 4)`)
  console.log('An interrupted run is run again: each phase skips the blocks and pairs already stored')
  process.exit(1)
}

async function main () {
  const phase = process.argv[2]
  if (!['A', 'B'].includes(phase)) printUsageAndExit()
  const numbers = process.argv.slice(3)
  const notWhole = numbers.find(v => !WHOLE_NUMBER.test(v))
  if (notWhole !== undefined) {
    console.log(`fromBlock, toBlock, chunkBlocks and concurrency must be whole numbers, such as 3490000: got ${notWhole}`)
    printUsageAndExit()
  }
  const [fromArg, toArg, chunkArg, concurrencyArg] = numbers.map(Number)
  if (chunkArg === 0 || concurrencyArg === 0) {
    console.log('chunkBlocks and concurrency must be at least 1')
    printUsageAndExit()
  }

  let fetchers
  if (phase === 'B') {
    const initConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
    fetchers = Array.from({ length: concurrencyArg === undefined ? 4 : concurrencyArg }, () => new TokenState({ nod3, initConfig, log: console }))
  }

  const report = newReport(phase)
  exitOnUncaughtException(`[Tool ${toolName}]: Error backfilling NFT ownership`, () => `Stopped: ${JSON.stringify(report)}`)
  await runPhase({ phase, fromArg, toArg, chunkBlocks: chunkArg, fetchers, report })
  process.exit(exitCodeOf(report))
}

if (require.main === module) {
  main().catch(error => {
    console.log(`[Tool ${toolName}]: Error backfilling NFT ownership`)
    console.error(error)
    process.exit(1)
  })
}

import { prismaClient as defaultPrismaClient } from '../lib/prismaClient'
import { nftRepository, tokenStateRepository, configRepository } from '../repositories'
import { TRANSFER_TOPIC, TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC, NFT_STANDARDS } from '../lib/nftTransfers'
import nod3 from '../lib/nod3Connect'
import { TokenState } from '../services/classes/TokenState'
import { EXPLORER_INITIAL_CONFIG_ID } from '../lib/defaultConfig'
import { exitOnUncaughtException, WHOLE_NUMBER } from './utils'
import { retry } from '../lib/retry'

const toolName = process.argv[1].split('/').pop()

const READ_COMMITTED = { isolationLevel: 'ReadCommitted' }
const RACED_WRITE_ERRORS = ['P2002', 'P2003', 'P2025']
const WRITE_ATTEMPTS = 3
const NFT_TRANSFER_EVENTS = {
  OR: [
    { topic0: TRANSFER_TOPIC, topic3: { not: null } },
    { topic0: { in: [TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC] } }
  ]
}
const EVENT_FIELDS = {
  eventId: true,
  address: true,
  blockNumber: true,
  blockHash: true,
  transactionHash: true,
  timestamp: true,
  topic0: true,
  topic1: true,
  topic2: true,
  topic3: true,
  data: true
}

const newReport = phase => phase === 'A'
  ? { blocksRead: 0, blocksWritten: 0, blocksAlreadyStored: 0, blocksRaced: 0, facts: 0 }
  : { blocksRead: 0, pairs: 0, pairsAlreadyStored: 0, pairsWritten: 0, pairsFailed: [], pairsRaced: 0 }

const toRawEvent = ({ topic0, topic1, topic2, topic3, ...event }) => ({
  ...event,
  topics: [topic0, topic1, topic2, topic3].filter(topic => topic !== null)
})
const isRacedWrite = error => !!error && RACED_WRITE_ERRORS.includes(error.code)
const lockBlockIfNotReplaced = (prismaClient, { number, hash }) => prismaClient.block.update({
  where: { number, hash },
  data: { hash },
  select: { number: true }
})

async function writtenOrDeletedMeanwhile (prismaClient, { hash }) {
  const [stored, facts] = await Promise.all([
    prismaClient.block.findUnique({ where: { hash }, select: { number: true } }),
    prismaClient.token_transfer.findFirst({
      where: { blockHash: hash, standard: { in: NFT_STANDARDS } },
      select: { eventId: true }
    })
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
  while (true) {
    const blocks = await nextBlocks(prismaClient, cursor, toBlock, chunkBlocks)
    if (!blocks.length) return
    await processChunk(blocks)
    cursor = blocks[blocks.length - 1].number + 1
    onChunkDone({ firstBlock: blocks[0].number, lastBlock: cursor - 1 })
  }
}

export async function backfillTransfers ({
  prismaClient = defaultPrismaClient,
  fromBlock,
  toBlock,
  chunkBlocks,
  onChunkDone = () => {},
  report = newReport('A')
}) {
  const writeTransfers = (block, events) => retry({
    maxAttempts: WRITE_ATTEMPTS,
    isRetryable: isRacedWrite,
    run: async () => {
      const statements = await nftRepository.insertStatements(block, events)
      if (!statements.length) return
      const [{ count }] = await prismaClient.$transaction(statements, READ_COMMITTED)
      report.blocksWritten++
      report.facts += count
    },
    doneByAnotherWriter: async error => {
      if (!(await writtenOrDeletedMeanwhile(prismaClient, block))) return false
      report.blocksRaced++
      console.log(`block ${block.number} ${block.hash}: ${error.code}, deleted or written by another writer meanwhile. Skipped.`)
      return true
    },
    beforeRetry: async (error, attempt) => {
      console.log(`block ${block.number} ${block.hash}: ${error.code} on attempt ${attempt}, a holder changed since it was read. Reading again`)
    }
  })

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

export async function backfillTokenStates ({
  prismaClient = defaultPrismaClient,
  fromBlock,
  toBlock,
  chunkBlocks,
  fetchers,
  onChunkDone = () => {},
  report = newReport('B')
}) {
  const fetchedStates = new Map()
  const pairKey = ({ contract, blockNumber, blockHash }) => `${contract}|${blockNumber}|${blockHash}`

  const readPairsToWrite = async hashes => {
    const pairs = await prismaClient.token_transfer.groupBy({
      by: ['contract', 'blockNumber', 'blockHash'],
      where: { blockHash: { in: hashes }, standard: { in: NFT_STANDARDS } },
      orderBy: [{ blockNumber: 'asc' }, { contract: 'asc' }]
    })
    if (!pairs.length) return { pairs, pairsToWrite: [] }
    const stored = await prismaClient.token_state_at_block.findMany({
      where: { blockNumber: { in: [...new Set(pairs.map(p => p.blockNumber))] } },
      select: { contract: true, blockNumber: true }
    })
    const storedKeys = new Set(stored.map(s => `${s.contract}|${s.blockNumber}`))
    return { pairs, pairsToWrite: pairs.filter(p => !storedKeys.has(`${p.contract}|${p.blockNumber}`)) }
  }

  const recordFetch = (pair, { state, failure }) => {
    if (failure) {
      report.pairsFailed.push({ ...pair, failure: failure.message })
      console.log(`pair ${pair.contract} at ${pair.blockNumber}: ${failure.message}. Not stored; a rerun retries it.`)
      return
    }
    fetchedStates.set(pairKey(pair), state)
  }

  const writeBlockStates = (block, pairsOfBlock) => {
    let pairsToWrite = pairsOfBlock
    return retry({
      maxAttempts: WRITE_ATTEMPTS,
      isRetryable: isRacedWrite,
      run: async () => {
        const fetched = pairsToWrite.map(pair => fetchedStates.get(pairKey(pair))).filter(Boolean)
        if (!fetched.length) return
        await prismaClient.$transaction([
          lockBlockIfNotReplaced(prismaClient, block),
          ...tokenStateRepository.insertStatements(block, fetched)
        ], READ_COMMITTED)
        report.pairsWritten += fetched.length
      },
      beforeRetry: async (error, attempt) => {
        report.pairsRaced++
        console.log(`block ${block.number} ${block.hash}: ${error.code} on attempt ${attempt}, reading its pairs again`)
        pairsToWrite = (await readPairsToWrite([block.hash])).pairsToWrite
        await fetchPairs(fetchers, pairsToWrite.filter(pair => !fetchedStates.has(pairKey(pair))), recordFetch)
      }
    })
  }

  await eachChunk({ prismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone }, async blocks => {
    report.blocksRead += blocks.length
    const { pairs, pairsToWrite } = await readPairsToWrite(blocks.map(b => b.hash))
    report.pairs += pairs.length
    report.pairsAlreadyStored += pairs.length - pairsToWrite.length

    await fetchPairs(fetchers, pairsToWrite.filter(pair => !fetchedStates.has(pairKey(pair))), recordFetch)

    for (const block of blocks) {
      const pairsOfBlock = pairsToWrite.filter(pair => pair.blockHash === block.hash)
      if (pairsOfBlock.length) await writeBlockStates(block, pairsOfBlock)
    }
    for (const pair of pairsToWrite) fetchedStates.delete(pairKey(pair))
  })

  return report
}

export async function runPhase ({
  prismaClient = defaultPrismaClient,
  phase,
  fromArg,
  toArg,
  chunkBlocks = 1000,
  fetchers,
  report = newReport(phase)
}) {
  const fromBlock = fromArg !== undefined ? fromArg : 0
  const highest = await prismaClient.block.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
  const toBlock = toArg !== undefined ? toArg : (highest ? highest.number : -1)
  if (fromArg !== undefined && fromBlock > toBlock) {
    const bound = toArg !== undefined
      ? `toBlock ${toBlock}`
      : highest ? `toBlock ${toBlock} (the highest stored block)` : 'every stored block (no block is stored)'
    throw new Error(`fromBlock ${fromBlock} is above ${bound}: the range is empty`)
  }
  const started = Date.now()

  console.log(`${toolName} phase ${phase}: blocks ${fromBlock}..${toBlock}, ${chunkBlocks} stored blocks per chunk`)
  const onChunkDone = ({ firstBlock, lastBlock }) =>
    console.log(`chunk ${firstBlock}..${lastBlock} done · ${Math.round((Date.now() - started) / 1000)} s`)

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
    fetchers = Array.from(
      { length: concurrencyArg === undefined ? 4 : concurrencyArg },
      () => new TokenState({ nod3, initConfig, log: console })
    )
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

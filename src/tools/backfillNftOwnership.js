import fs from 'fs'
import path from 'path'
import { prismaClient as defaultPrismaClient } from '../lib/prismaClient'
import { nftRepository, tokenStateRepository, configRepository } from '../repositories'
import { TRANSFER_TOPIC, TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC, NFT_STANDARDS } from '../lib/nftTransfers'
import { createCountedNod3 } from '../lib/nodeCallStats'
import { TokenState } from '../services/classes/TokenState'
import { EXPLORER_INITIAL_CONFIG_ID } from '../lib/defaultConfig'
import config from '../lib/config'

const toolName = process.argv[1].split('/').pop()

const READ_COMMITTED = { isolationLevel: 'ReadCommitted' }
const RACED_WRITE_ERRORS = ['P2002', 'P2003']
const WRITE_ATTEMPTS = 3
const FETCH_ATTEMPTS = 3
const NFT_TRANSFER_EVENTS = {
  OR: [
    { topic0: TRANSFER_TOPIC, topic3: { not: null } },
    { topic0: { in: [TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC] } }
  ]
}
const EVENT_FIELDS = { eventId: true, address: true, blockNumber: true, blockHash: true, transactionHash: true, timestamp: true, topic0: true, topic1: true, topic2: true, topic3: true, data: true }

const resumeFile = phase => path.join(process.cwd(), `backfill-nft-ownership-${phase}.resume`)
const toRawEvent = ({ topic0, topic1, topic2, topic3, ...event }) => ({ ...event, topics: [topic0, topic1, topic2, topic3].filter(topic => topic !== null) })
const isRacedWrite = error => !!error && RACED_WRITE_ERRORS.includes(error.code)

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
    const complete = await processChunk(blocks)
    cursor = blocks[blocks.length - 1].number + 1
    await onChunkDone({ firstBlock: blocks[0].number, lastBlock: cursor - 1, nextBlock: cursor, complete })
  }
}

export async function backfillTransfers ({ prismaClient = defaultPrismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone = () => {} }) {
  const report = { blocksRead: 0, blocksWritten: 0, blocksAlreadyStored: 0, blocksRaced: 0, facts: 0 }

  await eachChunk({ prismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone }, async blocks => {
    report.blocksRead += blocks.length
    const events = await prismaClient.event.findMany({
      where: { blockHash: { in: blocks.map(b => b.hash) }, ...NFT_TRANSFER_EVENTS },
      select: EVENT_FIELDS,
      orderBy: { eventId: 'asc' }
    })
    if (!events.length) return true

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
      const statements = nftRepository.insertStatements(block, eventsByBlock.get(block.hash))
      if (!statements.length) continue
      try {
        const [{ count }] = await prismaClient.$transaction(statements, READ_COMMITTED)
        report.blocksWritten++
        report.facts += count
      } catch (error) {
        if (!isRacedWrite(error)) throw error
        report.blocksRaced++
        console.log(`block ${block.number} ${block.hash}: ${error.code}, deleted or written by another writer meanwhile. Skipped.`)
      }
    }
    return true
  })

  return report
}

export async function fetchWithoutNodeErrors (fetcher, { contract, blockNumber }) {
  const attempts = []
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    let state = null
    let failure = null
    try {
      state = await fetcher.fetchOne(contract, blockNumber)
    } catch (error) {
      failure = error
    }
    const stats = fetcher.takeStats()
    attempts.push({ ...stats, failure: failure ? failure.message : null })
    if (!failure && !stats.nodeErrors) return { state, attempts }
  }
  return { state: null, attempts }
}

async function fetchPairs (fetchers, pairs, onFetched) {
  const queue = [...pairs]
  await Promise.all(fetchers.map(async fetcher => {
    while (queue.length) {
      const pair = queue.shift()
      onFetched(pair, await fetchWithoutNodeErrors(fetcher, pair))
    }
  }))
}

export async function backfillTokenStates ({ prismaClient = defaultPrismaClient, fromBlock, toBlock, chunkBlocks, fetchers, onChunkDone = () => {} }) {
  const report = { blocksRead: 0, pairs: 0, pairsAlreadyStored: 0, pairsWritten: 0, pairsRetried: 0, pairsFailed: [], pairsRaced: 0, calls: 0, reverts: 0, nodeErrors: 0, tokenReadErrors: 0, firstAttemptTokenReadErrors: 0 }
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

  const recordFetch = (pair, { state, attempts }) => {
    for (const stats of attempts) ['calls', 'reverts', 'nodeErrors', 'tokenReadErrors'].forEach(key => { report[key] += stats[key] })
    report.firstAttemptTokenReadErrors += attempts[0].tokenReadErrors
    if (attempts.length > 1) report.pairsRetried++
    if (state) {
      states.set(pairKey(pair), state)
      return
    }
    report.pairsFailed.push({ ...pair, nodeErrorsPerAttempt: attempts.map(a => a.nodeErrors), lastFailure: attempts[attempts.length - 1].failure })
    console.log(`pair ${pair.contract} at ${pair.blockNumber}: every attempt saw a node error. Not stored; a rerun retries it.`)
  }

  const writeBlock = async (block, planned) => {
    let todo = planned
    for (let attempt = 1; todo.length; attempt++) {
      if (attempt > 1) await fetchPairs(fetchers, todo.filter(pair => !states.has(pairKey(pair))), recordFetch)
      const fetched = todo.map(pair => states.get(pairKey(pair))).filter(Boolean)
      if (!fetched.length) return
      try {
        await prismaClient.$transaction(tokenStateRepository.insertStatements(block, fetched), READ_COMMITTED)
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

    const failedBefore = report.pairsFailed.length
    await fetchPairs(fetchers, todo.filter(pair => !states.has(pairKey(pair))), recordFetch)

    for (const block of blocks) {
      const planned = todo.filter(pair => pair.blockHash === block.hash)
      if (planned.length) await writeBlock(block, planned)
    }
    for (const pair of todo) states.delete(pairKey(pair))
    return report.pairsFailed.length === failedBefore
  })

  return report
}

export function readResume (file) {
  if (!fs.existsSync(file)) return null
  const value = parseInt(fs.readFileSync(file, 'utf-8').trim())
  return isNaN(value) ? null : value
}

export function writeResume (file, nextBlock) {
  fs.writeFileSync(`${file}.next`, `${nextBlock}\n`)
  fs.renameSync(`${file}.next`, file)
}

export async function runPhase ({ prismaClient = defaultPrismaClient, phase, fromArg, toArg, chunkBlocks = 1000, markerFile = resumeFile(phase), transfersMarkerFile = resumeFile('A'), fetchers }) {
  const resumed = readResume(markerFile)
  const fromBlock = fromArg !== undefined ? fromArg : (resumed || 0)
  const transfersMarker = phase === 'B' ? readResume(transfersMarkerFile) : null
  const transfersDoneBelow = phase === 'B' ? (transfersMarker || 0) : Infinity
  if (phase === 'B' && toArg === undefined && transfersMarker === null) {
    console.log(`Phase A's resume marker is missing or unreadable in ${path.dirname(transfersMarkerFile)}: run phase A from this working directory first`)
    return { refusedWithoutPhaseAMarker: true }
  }
  const highest = await prismaClient.block.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
  const toBlock = toArg !== undefined ? toArg : Math.min(highest ? highest.number : -1, transfersDoneBelow - 1)
  const startsAtOrBelowMarker = fromBlock <= (resumed || 0)
  const started = Date.now()

  console.log(`${toolName} phase ${phase}: blocks ${fromBlock}..${toBlock}, ${chunkBlocks} stored blocks per chunk${resumed !== null && fromArg === undefined ? ' (from the resume marker)' : ''}`)
  if (!startsAtOrBelowMarker) console.log(`This run starts above ${resumed === null ? 'block 0 and no resume marker' : `the resume marker ${resumed}`}: it does not move the marker, because blocks below ${fromBlock} may still lack facts`)
  if (startsAtOrBelowMarker && toArg !== undefined && toBlock >= transfersDoneBelow) console.log(`Phase A's resume marker is ${transfersMarker === null ? 'missing or unreadable' : `at ${transfersMarker}`}: blocks from ${transfersDoneBelow} on may still lack transfers, so this run does not move phase B's marker past ${transfersDoneBelow}`)

  let watermark = startsAtOrBelowMarker
  const onChunkDone = ({ firstBlock, lastBlock, nextBlock, complete }) => {
    watermark = watermark && complete
    if (watermark) writeResume(markerFile, Math.min(nextBlock, transfersDoneBelow))
    console.log(`chunk ${firstBlock}..${lastBlock} ${complete ? 'done' : 'INCOMPLETE'} · ${Math.round((Date.now() - started) / 1000)} s`)
  }

  const report = phase === 'A'
    ? await backfillTransfers({ prismaClient, fromBlock, toBlock, chunkBlocks, onChunkDone })
    : await backfillTokenStates({ prismaClient, fromBlock, toBlock, chunkBlocks, fetchers, onChunkDone })

  console.log(`Done in ${Date.now() - started} ms: ${JSON.stringify(report)}`)
  return report
}

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName} phase(A: transfers and ownership from event | B: token state at each transfer block, reads the node) fromBlock(optional; default: the resume marker, else 0) toBlock(optional; default: the highest stored block, and for phase B the block below phase A's resume marker) chunkBlocks(optional, default 1000) concurrency(optional, phase B node readers, default 4)`)
  console.log(`Resume markers: ${resumeFile('A')}, ${resumeFile('B')} (the next block to process; only a run that starts at or below it moves it, and phase B's never passes phase A's; delete to start over)`)
  process.exit(1)
}

async function main () {
  const phase = process.argv[2]
  if (!['A', 'B'].includes(phase)) printUsageAndExit()
  const [fromArg, toArg, chunkArg, concurrencyArg] = process.argv.slice(3).map(v => (v === undefined ? undefined : parseInt(v)))
  if ([fromArg, toArg, chunkArg, concurrencyArg].some(v => v !== undefined && (isNaN(v) || v < 0))) printUsageAndExit()
  if (chunkArg === 0 || concurrencyArg === 0) {
    console.log('chunkBlocks and concurrency must be at least 1')
    printUsageAndExit()
  }

  let fetchers
  if (phase === 'B') {
    const initConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
    fetchers = Array.from({ length: concurrencyArg === undefined ? 4 : concurrencyArg }, () => {
      const { nod3, takeStats } = createCountedNod3(config.source)
      const tokenState = new TokenState({ nod3, initConfig, log: console })
      return { fetchOne: (contract, blockNumber) => tokenState.fetchOne(contract, blockNumber), takeStats }
    })
  }

  const report = await runPhase({ phase, fromArg, toArg, chunkBlocks: chunkArg, fetchers })
  process.exit(report.refusedWithoutPhaseAMarker || (report.pairsFailed && report.pairsFailed.length) ? 1 : 0)
}

if (require.main === module) {
  main().catch(error => {
    console.log(`[Tool ${toolName}]: Error backfilling NFT ownership`)
    console.error(error)
    process.exit(1)
  })
}

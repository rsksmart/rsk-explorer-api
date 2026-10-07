import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { soliditySignature } from '@rsksmart/rsk-contract-parser/dist/lib/utils'
import erc721Abi from '@rsksmart/rsk-contract-parser/dist/lib/jsonAbis/ERC721.json'
import erc1155Abi from '@rsksmart/rsk-contract-parser/dist/lib/jsonAbis/ERC1155.json'
import ContractEventsUpdater from '../services/classes/ContractEventsUpdater'
import { createCountedNod3 } from '../lib/nodeCallStats'
import { nftTokensInterfaces } from '../lib/types'
import config from '../lib/config'
import fs from 'fs'
import path from 'path'

const toolName = process.argv[1].split('/').pop()

const NFT_EVENT_TOPIC0S = new Set(
  [...erc721Abi, ...erc1155Abi]
    .filter(fragment => fragment && fragment.type === 'event')
    .map(event => `0x${soliditySignature(`${event.name}(${(event.inputs || []).map(input => input.type).join(',')})`)}`)
)

const failedEventTopic0 = event => {
  const raw = event.eventDebugData && event.eventDebugData.event
  const topic0 = raw && raw.topics && raw.topics[0]
  return topic0 ? topic0.toLowerCase() : null
}

const failedNftEvents = events => events.filter(event =>
  event.error && NFT_EVENT_TOPIC0S.has(failedEventTopic0(event))
).length

const DETECTION_TIMEOUT_MS = 60000
const DETECTION_ATTEMPTS = 3
const RESUME_FILE = path.join(process.cwd(), 'redetect-nft-contracts.resume')

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName} pageSize(number: required) targetAddress(address: optional, processes a single candidate)`)
  console.log(`Resume marker: ${RESUME_FILE} (one processed address per line; delete it to reprocess from scratch)`)
  process.exit(1)
}

function withTimeout (promise, ms, label) {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function readResumeFile () {
  if (!fs.existsSync(RESUME_FILE)) return new Set()
  return new Set(fs.readFileSync(RESUME_FILE, 'utf-8').split('\n').filter(Boolean))
}

async function detectWithoutNodeErrors ({ updater, address, takeStats, progress }) {
  const nodeErrorsPerAttempt = []

  for (let attempt = 1; attempt <= DETECTION_ATTEMPTS; attempt++) {
    let detected = null
    let failure = null
    try {
      detected = await withTimeout(updater.getContractParser(address), DETECTION_TIMEOUT_MS, `getContractParser(${address})`)
    } catch (error) {
      failure = error
    }
    const { nodeErrors, lastNodeError } = takeStats()
    nodeErrorsPerAttempt.push(nodeErrors)

    if (!failure && !nodeErrors) return { contractDetails: detected.contractDetails, nodeErrorsPerAttempt }
    console.log(`${progress} ${address}: detection attempt ${attempt} saw ${nodeErrors} rejected node call(s)${failure ? ` and failed (${failure.message})` : ''}${lastNodeError ? `, last: ${lastNodeError}` : ''}. Nothing stored from it.`)
  }

  return { contractDetails: null, nodeErrorsPerAttempt }
}

export async function processCandidate ({ updater, address, pageSize, progress = '', markProcessed, takeStats }) {
  try {
    console.log(`${progress} ${address}: detecting interfaces...`)
    const { contractDetails, nodeErrorsPerAttempt } = await detectWithoutNodeErrors({ updater, address, takeStats, progress })
    const retries = nodeErrorsPerAttempt.length - 1

    if (!contractDetails) {
      console.log(`${progress} ${address}: every detection attempt saw a node error. Not stored and not marked as processed; a rerun retries it.`)
      return { bucket: 'failed', entry: { address, nodeErrorsPerAttempt } }
    }

    const savedRows = await updater.saveContractDetails(address, contractDetails)
    const isNft = contractDetails.interfaces.some(i => nftTokensInterfaces.includes(i))
    console.log(`${progress} ${address}: interfaces ${JSON.stringify(contractDetails.interfaces)}${isNft ? '' : ' (no NFT interface)'}. Interface/method rows added: ${savedRows}`)

    const result = await updater.updateContractEvents(address, pageSize)
    const decodeNodeErrors = takeStats().nodeErrors
    console.log(`${progress} ${address}: re-decoded events: ${result.updatedEvents.amount}`)

    const failedEvents = failedNftEvents(result.updatedEvents.events)
    const otherFailures = result.updatedEvents.events.filter(event => event.error).length - failedEvents

    if (otherFailures > 0) {
      console.log(`${progress} ${address}: ${otherFailures} non-NFT event(s) could not decode (reported, not blocking).`)
    }

    if (failedEvents > 0 || decodeNodeErrors > 0) {
      console.log(`${progress} ${address}: ${failedEvents} NFT event(s) failed to re-decode, ${decodeNodeErrors} rejected node call(s) while re-decoding. Not marked as processed; a rerun retries it.`)
      return { bucket: 'failed', entry: { address, updatedEvents: result.updatedEvents.amount, failedEvents, otherFailures, nodeErrorsPerAttempt, decodeNodeErrors } }
    }

    markProcessed(address)
    const entry = { address, interfaces: contractDetails.interfaces, updatedEvents: result.updatedEvents.amount, otherFailures, retries }
    return { bucket: isNft ? 'tagged' : 'notNft', entry }
  } catch (error) {
    console.log(`${progress} ${address}: FAILED (${error.message}). Not marked as processed; a rerun retries it.`)
    return { bucket: 'failed', entry: { address, error: error.message } }
  }
}

async function main () {
  const pageSize = parseInt(process.argv[2])
  if (isNaN(pageSize) || pageSize <= 0) {
    console.log('Invalid pageSize provided. Must be a positive number')
    printUsageAndExit()
  }

  let targetAddress = process.argv[3]
  if (targetAddress) {
    if (!isAddress(targetAddress)) {
      console.log('Invalid target address provided. Must be a valid address')
      printUsageAndExit()
    }
    targetAddress = targetAddress.toLowerCase()
  }

  const { nod3, takeStats } = createCountedNod3(config.source)
  const updater = new ContractEventsUpdater({ nod3 })
  const started = Date.now()

  console.log(`${toolName}`)
  console.log('Discovering candidates: emitters of four-topic Transfer, TransferSingle and TransferBatch logs')

  let candidates = await updater.findNftTransferEmitters()
  console.log(`Candidates found: ${candidates.length}`)

  if (targetAddress) {
    candidates = candidates.filter(address => address === targetAddress)
    if (!candidates.length) {
      console.log(`Target address ${targetAddress} emits no NFT transfer events. Nothing to do.`)
      process.exit(0)
    }
    console.log(`Restricted to target address ${targetAddress}`)
  }

  const processed = readResumeFile()
  const pending = candidates.filter(address => !processed.has(address))
  if (processed.size) {
    console.log(`Resume file: ${processed.size} addresses already processed, ${pending.length} pending`)
  }

  const summary = { tagged: [], notNft: [], failed: [] }
  const totals = { calls: 0, reverts: 0, nodeErrors: 0, tokenReadErrors: 0 }
  const countingTakeStats = () => {
    const stats = takeStats()
    Object.keys(totals).forEach(key => { totals[key] += stats[key] })
    return stats
  }

  for (const [index, address] of pending.entries()) {
    const progress = `[${index + 1}/${pending.length}]`
    const { bucket, entry } = await processCandidate({
      updater,
      address,
      pageSize,
      progress,
      takeStats: countingTakeStats,
      markProcessed: addr => fs.appendFileSync(RESUME_FILE, addr + '\n')
    })
    summary[bucket].push(entry)
  }

  const retried = [...summary.tagged, ...summary.notNft].filter(entry => entry.retries > 0).length
  console.log('')
  console.log(`Done in ${Date.now() - started} ms. NFT interface: ${summary.tagged.length}, no NFT interface: ${summary.notNft.length}, failed: ${summary.failed.length}, stored after a retry: ${retried}`)
  console.log(`Node calls: ${totals.calls}, reverts: ${totals.reverts}, rejected: ${totals.nodeErrors}, of them token reads: ${totals.tokenReadErrors}`)

  const fileName = `redetect-nft-contracts-${Date.now()}.json`
  const resultFilePath = path.join(__dirname, fileName)
  fs.writeFileSync(resultFilePath, JSON.stringify({ ...summary, totals }, null, 2))
  console.log(`Result file saved to ${resultFilePath}`)

  process.exit(summary.failed.length ? 1 : 0)
}

if (require.main === module) {
  main().catch(error => {
    console.log(`[Tool ${toolName}]: Error re-detecting NFT contracts`)
    console.error(error)
    process.exit(1)
  })
}

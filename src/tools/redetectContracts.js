import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { soliditySignature } from '@rsksmart/rsk-contract-parser/dist/lib/utils'
import erc721Abi from '@rsksmart/rsk-contract-parser/dist/lib/jsonAbis/ERC721.json'
import erc1155Abi from '@rsksmart/rsk-contract-parser/dist/lib/jsonAbis/ERC1155.json'
import ContractEventsUpdater from '../services/classes/ContractEventsUpdater'
import { createCountedNod3, REQUEST_TIMEOUT_MS } from '../lib/nodeCallStats'
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

export const CANDIDATE_SETS = {
  'nft-transfer-emitters': {
    description: 'emitters of four-topic Transfer, TransferSingle and TransferBatch logs',
    find: updater => updater.findNftTransferEmitters(),
    interfaces: nftTokensInterfaces,
    blockingEventTopic0s: NFT_EVENT_TOPIC0S
  }
}

export const candidateSetNamed = name => Object.prototype.hasOwnProperty.call(CANDIDATE_SETS, name) ? CANDIDATE_SETS[name] : null

const failedBlockingEvents = (events, candidateSet) => events.filter(event =>
  event.error && candidateSet.blockingEventTopic0s.has(failedEventTopic0(event))
).length

const DETECTION_TIMEOUT_MS = 2 * REQUEST_TIMEOUT_MS
const DETECTION_ATTEMPTS = 3
const resumeFile = setName => path.join(process.cwd(), `redetect-contracts-${setName}.resume`)

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName} candidateSet(${Object.keys(CANDIDATE_SETS).join(' | ')}) pageSize(number: required) targetAddress(address: optional, processes a single candidate)`)
  Object.entries(CANDIDATE_SETS).forEach(([name, { description }]) => console.log(`  ${name}: ${description}`))
  console.log(`Resume marker: ${resumeFile('<candidateSet>')} (one processed address per line; delete it to reprocess from scratch)`)
  process.exit(1)
}

function withTimeout (promise, ms, label) {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function readResumeFile (file) {
  if (!fs.existsSync(file)) return new Set()
  return new Set(fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean))
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

    if (!failure && !nodeErrors) return { detection: detected, nodeErrorsPerAttempt }
    console.log(`${progress} ${address}: detection attempt ${attempt} saw ${nodeErrors} rejected node call(s)${failure ? ` and failed (${failure.message})` : ''}${lastNodeError ? `, last: ${lastNodeError}` : ''}. Nothing stored from it.`)
  }

  return { detection: null, nodeErrorsPerAttempt }
}

export async function processCandidate ({ updater, candidateSet, address, pageSize, progress = '', markProcessed, takeStats }) {
  try {
    console.log(`${progress} ${address}: detecting interfaces...`)
    const { detection, nodeErrorsPerAttempt } = await detectWithoutNodeErrors({ updater, address, takeStats, progress })
    const retries = nodeErrorsPerAttempt.length - 1

    if (!detection) {
      console.log(`${progress} ${address}: every detection attempt saw a node error. Not stored and not marked as processed; a rerun retries it.`)
      return { bucket: 'failed', entry: { address, nodeErrorsPerAttempt } }
    }

    const { contractDetails } = detection
    const savedRows = await updater.saveContractDetails(address, contractDetails)
    const isTagged = contractDetails.interfaces.some(i => candidateSet.interfaces.includes(i))
    console.log(`${progress} ${address}: interfaces ${JSON.stringify(contractDetails.interfaces)}${isTagged ? '' : ` (none of ${candidateSet.interfaces.join(', ')})`}. Interface/method rows added: ${savedRows}`)

    const result = await updater.updateContractEvents(address, pageSize, 0, detection)
    const decodeNodeErrors = takeStats().nodeErrors
    console.log(`${progress} ${address}: re-decoded events: ${result.updatedEvents.amount}`)

    const failedEvents = failedBlockingEvents(result.updatedEvents.events, candidateSet)
    const otherFailures = result.updatedEvents.events.filter(event => event.error).length - failedEvents

    if (otherFailures > 0) {
      console.log(`${progress} ${address}: ${otherFailures} other event(s) could not decode (reported, not blocking).`)
    }

    if (failedEvents > 0 || decodeNodeErrors > 0) {
      console.log(`${progress} ${address}: ${failedEvents} event(s) of the candidate set failed to re-decode, ${decodeNodeErrors} rejected node call(s) while re-decoding. Not marked as processed; a rerun retries it.`)
      return { bucket: 'failed', entry: { address, updatedEvents: result.updatedEvents.amount, failedEvents, otherFailures, nodeErrorsPerAttempt, decodeNodeErrors } }
    }

    markProcessed(address)
    const entry = { address, interfaces: contractDetails.interfaces, updatedEvents: result.updatedEvents.amount, otherFailures, retries }
    return { bucket: isTagged ? 'tagged' : 'notTagged', entry }
  } catch (error) {
    console.log(`${progress} ${address}: FAILED (${error.message}). Not marked as processed; a rerun retries it.`)
    return { bucket: 'failed', entry: { address, error: error.message } }
  }
}

async function main () {
  const setName = process.argv[2]
  const candidateSet = candidateSetNamed(setName)
  if (!candidateSet) {
    console.log(`Unknown candidate set: ${setName}`)
    printUsageAndExit()
  }

  const pageSize = parseInt(process.argv[3])
  if (isNaN(pageSize) || pageSize <= 0) {
    console.log('Invalid pageSize provided. Must be a positive number')
    printUsageAndExit()
  }

  let targetAddress = process.argv[4]
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

  console.log(`${toolName} ${setName}`)
  console.log(`Discovering candidates: ${candidateSet.description}`)

  let candidates = await candidateSet.find(updater)
  console.log(`Candidates found: ${candidates.length}`)

  if (targetAddress) {
    candidates = candidates.filter(address => address === targetAddress)
    if (!candidates.length) {
      console.log(`Target address ${targetAddress} is not in the candidate set ${setName}. Nothing to do.`)
      process.exit(0)
    }
    console.log(`Restricted to target address ${targetAddress}`)
  }

  const resume = resumeFile(setName)
  const processed = readResumeFile(resume)
  const pending = candidates.filter(address => !processed.has(address))
  if (processed.size) {
    console.log(`Resume file: ${processed.size} addresses already processed, ${pending.length} pending`)
  }

  const summary = { tagged: [], notTagged: [], failed: [] }
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
      candidateSet,
      address,
      pageSize,
      progress,
      takeStats: countingTakeStats,
      markProcessed: addr => fs.appendFileSync(resume, addr + '\n')
    })
    summary[bucket].push(entry)
  }

  const retried = [...summary.tagged, ...summary.notTagged].filter(entry => entry.retries > 0).length
  console.log('')
  console.log(`Done in ${Date.now() - started} ms. tagged (${candidateSet.interfaces.join(', ')}): ${summary.tagged.length}, not tagged: ${summary.notTagged.length}, failed: ${summary.failed.length}, stored after a retry: ${retried}`)
  console.log(`Node calls: ${totals.calls}, reverts: ${totals.reverts}, rejected: ${totals.nodeErrors}, of them token reads: ${totals.tokenReadErrors}`)

  const fileName = `redetect-contracts-${setName}-${Date.now()}.json`
  const resultFilePath = path.join(__dirname, fileName)
  fs.writeFileSync(resultFilePath, JSON.stringify({ ...summary, totals }, null, 2))
  console.log(`Result file saved to ${resultFilePath}`)

  process.exit(summary.failed.length ? 1 : 0)
}

if (require.main === module) {
  main().catch(error => {
    console.log(`[Tool ${toolName}]: Error re-detecting contracts`)
    console.error(error)
    process.exit(1)
  })
}

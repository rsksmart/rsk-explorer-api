import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { soliditySignature } from '@rsksmart/rsk-contract-parser/dist/lib/utils'
import erc1155Abi from '@rsksmart/rsk-contract-parser/dist/lib/jsonAbis/ERC1155.json'
import ContractEventsUpdater from '../services/classes/ContractEventsUpdater'
import { contractsInterfaces } from '../lib/types'
import fs from 'fs'
import path from 'path'

const toolName = process.argv[1].split('/').pop()

const TOPIC0S = [
  '0x' + soliditySignature('TransferSingle(address,address,address,uint256,uint256)'),
  '0x' + soliditySignature('TransferBatch(address,address,address,uint256[],uint256[])')
]

const ERC1155_EVENT_TOPIC0S = new Set(
  erc1155Abi
    .filter(fragment => fragment && fragment.type === 'event')
    .map(event => `0x${soliditySignature(`${event.name}(${(event.inputs || []).map(input => input.type).join(',')})`)}`)
)

const failedEventTopic0 = event => {
  const raw = event.eventDebugData && event.eventDebugData.event
  const topic0 = raw && raw.topics && raw.topics[0]
  return topic0 ? topic0.toLowerCase() : null
}

const failedErc1155Events = events => events.filter(event =>
  event.error && ERC1155_EVENT_TOPIC0S.has(failedEventTopic0(event))
).length

const DETECTION_TIMEOUT_MS = 60000
const RESUME_FILE = path.join(process.cwd(), 'backfill-erc1155.resume')

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

export async function processCandidate ({ updater, address, pageSize, progress = '', markProcessed }) {
  try {
    console.log(`${progress} ${address}: detecting interfaces...`)
    const { contractDetails } = await withTimeout(
      updater.getContractParser(address), DETECTION_TIMEOUT_MS, `getContractParser(${address})`
    )

    if (!contractDetails.interfaces.includes(contractsInterfaces.ERC1155)) {
      console.log(`${progress} ${address}: NOT detected as ERC1155 (interfaces: ${JSON.stringify(contractDetails.interfaces)}). Needs manual review.`)
      markProcessed(address)
      return { bucket: 'notDetected', entry: address }
    }

    const savedRows = await updater.saveContractDetails(address, contractDetails)
    console.log(`${progress} ${address}: ERC1155 detected. Interface/method rows added: ${savedRows}`)

    const result = await updater.updateContractEvents(address, pageSize)
    console.log(`${progress} ${address}: re-decoded events: ${result.updatedEvents.amount}`)

    const failedEvents = failedErc1155Events(result.updatedEvents.events)
    const otherFailures = result.updatedEvents.events.filter(event => event.error).length - failedEvents

    if (otherFailures > 0) {
      console.log(`${progress} ${address}: ${otherFailures} non-ERC1155 event(s) could not decode (reported, not blocking).`)
    }

    if (failedEvents > 0) {
      console.log(`${progress} ${address}: ${failedEvents} ERC-1155 event(s) failed to re-decode. Not marked as processed; a rerun retries it.`)
      return { bucket: 'failed', entry: { address, updatedEvents: result.updatedEvents.amount, failedEvents, otherFailures } }
    }

    markProcessed(address)
    return { bucket: 'tagged', entry: { address, updatedEvents: result.updatedEvents.amount, otherFailures } }
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

  const updater = new ContractEventsUpdater()

  console.log(`${toolName}`)
  console.log(`Discovering candidates by topic0: ${TOPIC0S.join(', ')}`)

  let candidates = await updater.findEventEmittersByTopic0(TOPIC0S)
  console.log(`Candidates found: ${candidates.length}`)

  if (targetAddress) {
    candidates = candidates.filter(address => address === targetAddress)
    if (!candidates.length) {
      console.log(`Target address ${targetAddress} emits no ERC-1155 transfer events. Nothing to do.`)
      process.exit(0)
    }
    console.log(`Restricted to target address ${targetAddress}`)
  }

  const processed = readResumeFile()
  const pending = candidates.filter(address => !processed.has(address))
  if (processed.size) {
    console.log(`Resume file: ${processed.size} addresses already processed, ${pending.length} pending`)
  }

  const summary = { tagged: [], notDetected: [], failed: [] }

  for (const [index, address] of pending.entries()) {
    const progress = `[${index + 1}/${pending.length}]`
    const { bucket, entry } = await processCandidate({
      updater,
      address,
      pageSize,
      progress,
      markProcessed: addr => fs.appendFileSync(RESUME_FILE, addr + '\n')
    })
    summary[bucket].push(entry)
  }

  console.log('')
  console.log(`Done. Tagged and re-decoded: ${summary.tagged.length}, not detected: ${summary.notDetected.length}, failed: ${summary.failed.length}`)

  const fileName = `backfill-erc1155-${Date.now()}.json`
  const resultFilePath = path.join(__dirname, fileName)
  fs.writeFileSync(resultFilePath, JSON.stringify(summary, null, 2))
  console.log(`Result file saved to ${resultFilePath}`)

  process.exit(summary.failed.length ? 1 : 0)
}

if (require.main === module) {
  main().catch(error => {
    console.log(`[Tool ${toolName}]: Error backfilling ERC-1155 contracts`)
    console.error(error)
    process.exit(1)
  })
}

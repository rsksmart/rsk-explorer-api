import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { ERC721_AND_ERC1155_EVENT_TOPIC0S } from '@rsksmart/rsk-contract-parser'
import ContractEventsUpdater from '../services/classes/ContractEventsUpdater'
import { nftTokensInterfaces } from '../lib/types'
import { toTokenState } from '../services/classes/TokenState'
import { exitOnUncaughtException, WHOLE_NUMBER } from './utils'
import fs from 'fs'
import path from 'path'

const toolName = process.argv[1].split('/').pop()

const NFT_EVENT_TOPIC0S = new Set(ERC721_AND_ERC1155_EVENT_TOPIC0S)

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

export const candidateSetNamed = name => Object.hasOwn(CANDIDATE_SETS, name) ? CANDIDATE_SETS[name] : null

const failedBlockingEvents = (events, candidateSet) => events.filter(event =>
  event.error && candidateSet.blockingEventTopic0s.has(failedEventTopic0(event))
).length

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName} candidateSet(${Object.keys(CANDIDATE_SETS).join(' | ')}) pageSize(number: required) targetAddress(address: optional, processes a single candidate)`)
  Object.entries(CANDIDATE_SETS).forEach(([name, { description }]) => console.log(`  ${name}: ${description}`))
  console.log('An interrupted run is run again: it detects every candidate again and stores nothing twice')
  process.exit(1)
}

export async function processCandidate ({ updater, candidateSet, address, pageSize, progress = '' }) {
  try {
    console.log(`${progress} ${address}: detecting interfaces...`)
    const detection = await updater.getContractParser(address)
    const { contractDetails } = detection
    const savedRows = await updater.saveContractDetails(address, contractDetails)
    const isTagged = contractDetails.interfaces
      .some(contractInterface => candidateSet.interfaces.includes(contractInterface))
    console.log(`${progress} ${address}: interfaces ${JSON.stringify(contractDetails.interfaces)}${isTagged ? '' : ` (none of ${candidateSet.interfaces.join(', ')})`}. Interface/method rows added: ${savedRows}`)

    const result = await updater.updateContractEvents(address, pageSize, 0, detection)
    console.log(`${progress} ${address}: re-decoded events: ${result.updatedEvents.amount}`)

    const failedEvents = failedBlockingEvents(result.updatedEvents.events, candidateSet)
    const otherFailures = result.updatedEvents.events.filter(event => event.error).length - failedEvents

    if (otherFailures > 0) {
      console.log(`${progress} ${address}: ${otherFailures} other event(s) could not decode (reported, not blocking).`)
    }

    if (failedEvents > 0) {
      console.log(`${progress} ${address}: ${failedEvents} event(s) of the candidate set failed to re-decode. A rerun retries it.`)
      return {
        bucket: 'failed',
        entry: { address, updatedEvents: result.updatedEvents.amount, failedEvents, otherFailures }
      }
    }

    const entry = {
      address,
      interfaces: contractDetails.interfaces,
      updatedEvents: result.updatedEvents.amount,
      otherFailures
    }
    if (!isTagged) return { bucket: 'notTagged', entry }

    const { parser } = detection
    const tokenData = await parser.getDefaultTokenData(parser.makeContract(address))
    const tokenState = toTokenState(address, contractDetails, tokenData)
    entry.named = await updater.saveMissingTokenNames(address, tokenState)
    console.log(`${progress} ${address}: ${entry.named ? `wrote missing token data ${JSON.stringify(entry.named)}` : 'no missing token data written'}`)
    if (!tokenState.name && !await updater.hasStoredName(address)) {
      entry.unnamed = true
      console.log(`${progress} ${address}: name not returned (no name() or a failed call; rerun with this address)`)
    }
    return { bucket: 'tagged', entry }
  } catch (error) {
    console.log(`${progress} ${address}: FAILED (${error.message}). A rerun retries it.`)
    return { bucket: 'failed', entry: { address, error: error.message } }
  }
}

export async function redetectCandidates ({
  updater,
  candidateSet,
  candidates,
  pageSize,
  summary = { tagged: [], notTagged: [], failed: [], unnamed: [] }
}) {
  for (const [index, address] of candidates.entries()) {
    const progress = `[${index + 1}/${candidates.length}]`
    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize, progress })
    summary[bucket].push(entry)
    if (entry.unnamed) summary.unnamed.push(address)
  }

  return summary
}

async function main () {
  const setName = process.argv[2]
  const candidateSet = candidateSetNamed(setName)
  if (!candidateSet) {
    console.log(`Unknown candidate set: ${setName}`)
    printUsageAndExit()
  }

  const pageSizeArg = process.argv[3]
  const pageSize = Number(pageSizeArg)
  if (!WHOLE_NUMBER.test(pageSizeArg || '') || pageSize === 0) {
    console.log(`Invalid pageSize provided. Must be a whole number of at least 1, such as 50: got ${pageSizeArg}`)
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

  const updater = new ContractEventsUpdater()
  const started = Date.now()
  const summary = { tagged: [], notTagged: [], failed: [], unnamed: [] }
  const summaryLine = () => `tagged (${candidateSet.interfaces.join(', ')}): ${summary.tagged.length}, not tagged: ${summary.notTagged.length}, failed: ${summary.failed.length}, unnamed: ${summary.unnamed.length}`
  exitOnUncaughtException(
    `[Tool ${toolName}]: Error re-detecting contracts`,
    () => `Stopped after ${Date.now() - started} ms. ${summaryLine()}`
  )

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

  await redetectCandidates({ updater, candidateSet, candidates, pageSize, summary })

  console.log('')
  console.log(`Done in ${Date.now() - started} ms. ${summaryLine()}`)

  const fileName = `redetect-contracts-${setName}-${Date.now()}.json`
  const resultFilePath = path.join(__dirname, fileName)
  fs.writeFileSync(resultFilePath, JSON.stringify(summary, null, 2))
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

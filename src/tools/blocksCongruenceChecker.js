import fs from 'fs'
import path from 'path'
import nod3 from '../lib/nod3Connect'
import { blocksRepository } from '../repositories'
import { parseArguments } from './utils.js'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import { Setup } from '../lib/Setup'

const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/${toolName} [options]`)
  console.log(`Options:`)
  console.log(`  --fromHigherBlock <number>  Starting block number (higher). If not specified, uses the highest block in DB. If specified but higher than DB max, uses DB max.`)
  console.log(`  --toLowerBlock <number>     Ending block number (lower). If not specified, checks down to block 0.`)
  console.log(`  --insert                    If specified, inserts missing blocks and re-inserts bad ones after removal (similar to refreshBlocks).`)
  console.log(`  --progressSaveInterval <number>  Interval in seconds for saving progress to file (default: 60).`)
  console.log(`Examples:`)
  console.log(`  npx babel-node src/tools/${toolName}`)
  console.log(`  npx babel-node src/tools/${toolName} --fromHigherBlock 5000000 --toLowerBlock 4900000`)
  console.log(`  npx babel-node src/tools/${toolName} --toLowerBlock 4000000`)
  console.log(`  npx babel-node src/tools/${toolName} --insert`)
  console.log(`  npx babel-node src/tools/${toolName} --fromHigherBlock 5000000 --toLowerBlock 4900000 --insert`)
  console.log(`  npx babel-node src/tools/${toolName} --progressSaveInterval 30`)
  process.exit(1)
}

function getTimestampString () {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

export async function checkBlocksCongruence () {
  const validOptions = {
    '--fromHigherBlock': { name: 'fromHigherBlock', type: 'number', default: null, min: 0 },
    '--toLowerBlock': { name: 'toLowerBlock', type: 'number', default: null, min: 0 },
    '--insert': { name: 'insert', type: 'boolean', default: false },
    '--progressSaveInterval': { name: 'progressSaveInterval', type: 'number', default: 60, min: 1 }
  }

  let options
  try {
    options = parseArguments(validOptions)
  } catch (error) {
    console.log(`Error: ${error.message}`)
    printUsageAndExit()
  }

  let initConfig = null
  if (options.insert) {
    const log = console
    const { initConfig: config } = await Setup({ log }).start()
    initConfig = config
    console.log(`Insert mode enabled. Missing blocks will be inserted and bad blocks will be re-inserted after removal.`)
  }

  try {
    const [lastSavedBlock] = await blocksRepository.find({}, { number: true, hash: true }, { number: 'desc' }, 1)
    if (!lastSavedBlock || !lastSavedBlock.number) {
      throw new Error(`Database is empty. Skipping blocks check... (latest db block: ${lastSavedBlock})`)
    }

    // Determine the range of blocks to check
    let fromBlock = options.fromHigherBlock
    if (fromBlock === null) {
      fromBlock = lastSavedBlock.number
    } else if (fromBlock > lastSavedBlock.number) {
      fromBlock = lastSavedBlock.number
      console.log(`Warning: --fromHigherBlock was higher than DB max block. Using DB max: ${fromBlock}`)
    }

    const toBlock = options.toLowerBlock !== null ? options.toLowerBlock : 0

    if (fromBlock < 0) {
      throw new Error(`Invalid fromHigherBlock: ${fromBlock} must be >= 0`)
    }

    if (toBlock < 0) {
      throw new Error(`Invalid toLowerBlock: ${toBlock} must be >= 0`)
    }

    if (fromBlock < toBlock) {
      throw new Error(`Invalid range: fromHigherBlock (${fromBlock}) must be >= toLowerBlock (${toBlock})`)
    }

    const status = {
      fromBlock,
      toBlock,
      current: 0,
      checkedBlocks: 0,
      missingBlocks: 0,
      badBlocks: {
        total: 0,
        blocks: []
      },
      insertedBlocks: 0,
      erroredInserts: 0,
      congruenceCheckErrors: 0,
      insertMode: options.insert,
      startDate: new Date().toISOString(),
      endDate: null,
      lastUpdate: new Date().toISOString()
    }

    // Create result file path at the start
    const timestamp = getTimestampString()
    const fileName = `result_blocksCongruenceChecker_${timestamp}.jsonl`
    const resultFilePath = path.join(__dirname, fileName)

    // Helper function to append status to file (JSON Lines format)
    const appendStatusToFile = () => {
      try {
        status.lastUpdate = new Date().toISOString()
        const statusLine = JSON.stringify(status) + '\n'
        fs.appendFileSync(resultFilePath, statusLine)
      } catch (err) {
        console.error(`Error appending status to file: ${err.message}`)
      }
    }

    // Append initial status
    appendStatusToFile()
    const saveIntervalMs = options.progressSaveInterval * 1000
    console.log(`Checking blocks congruence from block ${fromBlock} to block ${toBlock}...`)
    console.log(`Results will be saved incrementally to: ${fileName} (JSON Lines format)`)
    console.log(`Progress will be saved every ${options.progressSaveInterval} seconds`)

    const intervalId = setInterval(() => {
      status.currentDate = new Date().toISOString()
      const insertInfo = options.insert ? `, inserted: ${status.insertedBlocks}, insert errors: ${status.erroredInserts}` : ''
      const errorInfo = status.congruenceCheckErrors > 0 ? `, congruence check errors: ${status.congruenceCheckErrors}` : ''
      console.log(`Saving progress: checked ${status.checkedBlocks} blocks (missing: ${status.missingBlocks}, bad: ${status.badBlocks.total}${insertInfo}${errorInfo}), current: ${status.current}`)
      appendStatusToFile()
    }, saveIntervalMs)

    for (let number = fromBlock; number >= toBlock; number--) {
      try {
        status.current = number

        const dbBlock = await blocksRepository.findOne({ number })
        if (!dbBlock) {
          status.missingBlocks++

          // Insert missing block if --insert flag is enabled
          if (options.insert && initConfig) {
            try {
              const nodeBlock = await nod3.eth.getBlock(number)
              if (nodeBlock) {
                const block = new Block(number, new BlocksBase({ nod3, initConfig }))
                await block.fetch()
                await block.save()
                status.insertedBlocks++
                console.log(`Missing block ${number} inserted successfully.`)
              } else {
                console.log(`Block ${number} not found in node. Skipping insertion.`)
              }
            } catch (insertError) {
              status.erroredInserts++
              console.error(`Error inserting missing block ${number}`)
              console.error(insertError)
            }
          }

          status.checkedBlocks++
          continue
        }

        const nodeBlock = await nod3.eth.getBlock(number)
        if (dbBlock.hash !== nodeBlock.hash) {
          await blocksRepository.deleteOne({ number })
          console.log(`Database block ${number} (hash ${dbBlock.hash}) didn't match node block (hash ${nodeBlock.hash}). Removed`)

          status.badBlocks.total++
          status.badBlocks.blocks.push({
            number,
            badBlockHash: dbBlock.hash,
            goodBlockHash: nodeBlock.hash
          })

          // Insert block if --insert flag is enabled
          if (options.insert && initConfig) {
            try {
              const block = new Block(number, new BlocksBase({ nod3, initConfig }))
              await block.fetch()
              await block.save()
              status.insertedBlocks++
              console.log(`Block ${number} re-inserted successfully.`)
            } catch (insertError) {
              status.erroredInserts++
              console.error(`Error re-inserting block ${number}`)
              console.error(insertError)
              status.badBlocks.blocks[status.badBlocks.blocks.length - 1].insertError = insertError.message
            }
          }

          // Append immediately after finding a bad block
          appendStatusToFile()
        }
      } catch (err) {
        status.congruenceCheckErrors++
        const errorType = err.name || 'UnknownError'
        const errorMessage = err.message || String(err)
        console.error(`[Block ${number}] Congruence check error (${errorType}): ${errorMessage}`)
        if (err.stack) {
          console.error(`[Block ${number}] Stack trace:`, err.stack)
        }
      }

      status.checkedBlocks++
    }

    clearInterval(intervalId)

    status.endDate = new Date().toISOString()

    const insertSummary = options.insert
      ? `, inserted: ${status.insertedBlocks}, insert errors: ${status.erroredInserts}`
      : ''
    const errorSummary = status.congruenceCheckErrors > 0 ? `, congruence check errors: ${status.congruenceCheckErrors}` : ''
    console.log(`Finished checking db blocks congruence. ${status.badBlocks.total} bad blocks removed.`)
    console.log(`Summary: checked ${status.checkedBlocks} blocks (missing: ${status.missingBlocks}, bad: ${status.badBlocks.total}${insertSummary}${errorSummary})`)

    // Final append with complete status
    appendStatusToFile()
    console.log(`Final results appended to: ${fileName}`)

    return status
  } catch (error) {
    console.error(`[${toolName}]: Error checking blocks congruence`)
    console.error(error)
    throw error
  }
}

checkBlocksCongruence()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

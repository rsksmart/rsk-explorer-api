import { prismaClient } from '../../lib/prismaClient'
import { keccak256, toBuffer, add0x } from '@rsksmart/rsk-utils'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

// Usage (from rsk-explorer-api root):
// npx babel-node src/tools/contracts/populateRuntimeBytecodeHash.js
// npx babel-node src/tools/contracts/populateRuntimeBytecodeHash.js --dry-run
// npx babel-node src/tools/contracts/populateRuntimeBytecodeHash.js --reset

const BATCH_SIZE = 100
const PROGRESS_FILE = join(__dirname, 'populateRuntimeBytecodeHash.progress.json')

function getHash (value, encoding = 'hex') {
  const hash = keccak256(toBuffer(value, encoding))
  return add0x(Buffer.isBuffer(hash) ? hash.toString(encoding) : hash)
}

function loadProgress () {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
  }
  return null
}

function saveProgress (progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

async function main () {
  const dryRun = process.argv.includes('--dry-run')
  const reset = process.argv.includes('--reset')

  if (reset && existsSync(PROGRESS_FILE)) {
    unlinkSync(PROGRESS_FILE)
    console.log('Progress file reset.')
  }

  try {
    const totalResult = await prismaClient.verification_result.count({
      where: {
        runtimeBytecode: { not: null },
        runtimeBytecodeHash: null
      }
    })

    if (totalResult === 0) {
      console.log('No records need runtime_bytecode_hash population.')
      return
    }

    console.log(`Found ${totalResult} record(s) with runtime_bytecode but no runtime_bytecode_hash.`)
    if (dryRun) console.log('[DRY RUN] No database updates will be performed.\n')

    const existing = loadProgress()
    const progress = existing && !reset
      ? existing
      : {
        processed: 0,
        updated: 0,
        skipped: 0,
        totalRecords: totalResult,
        lastProcessedId: null,
        startedAt: new Date().toISOString(),
        lastUpdateAt: new Date().toISOString()
      }

    if (existing && !reset) {
      console.log(`Resuming from previous run (processed: ${progress.processed}, updated: ${progress.updated}, skipped: ${progress.skipped})`)
    }

    while (true) {
      const whereClause = {
        runtimeBytecode: { not: null },
        runtimeBytecodeHash: null
      }

      if (progress.lastProcessedId) {
        whereClause.id = { gt: progress.lastProcessedId }
      }

      const batch = await prismaClient.verification_result.findMany({
        where: whereClause,
        select: {
          id: true,
          address: true,
          runtimeBytecode: true
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE
      })

      if (batch.length === 0) {
        break
      }

      for (const record of batch) {
        progress.processed++

        if (!record.runtimeBytecode) {
          progress.skipped++
          progress.lastProcessedId = record.id
          continue
        }

        const hash = getHash(record.runtimeBytecode)

        if (!dryRun) {
          await prismaClient.verification_result.update({
            where: { id: record.id },
            data: { runtimeBytecodeHash: hash }
          })
        }

        progress.updated++
        progress.lastProcessedId = record.id
      }

      progress.lastUpdateAt = new Date().toISOString()
      saveProgress(progress)

      const pct = progress.totalRecords > 0
        ? ((progress.processed / progress.totalRecords) * 100).toFixed(1)
        : '0'
      console.log(`Batch done — processed: ${progress.processed}, updated: ${progress.updated}, skipped: ${progress.skipped} (${pct}%)`)

      if (batch.length < BATCH_SIZE) {
        break
      }
    }

    console.log('\n✅ Done.')
    console.log(`   Processed: ${progress.processed}`)
    console.log(`   Updated:   ${progress.updated}`)
    console.log(`   Skipped:   ${progress.skipped}`)
    console.log(`   Progress file: ${PROGRESS_FILE}`)
  } finally {
    await prismaClient.$disconnect()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

import { prismaClient } from '../lib/prismaClient'

async function main () {
  const cursorField = 'txId'
  const DEFAULT_BATCH_SIZE = 2000
  const batchSizeArg = process.argv[2]

  let BATCH_SIZE = DEFAULT_BATCH_SIZE

  if (batchSizeArg) {
    const parsedBatchSize = parseInt(batchSizeArg, 10)

    if (isNaN(parsedBatchSize) || parsedBatchSize <= 0) {
      console.error(`Error: Optional argument "batch_size" must be a positive number`)
      console.log(`Usage: npx babel-node src/dbPatches/populateTxStatusColumn.js [batch_size]`)
      console.log(`Example: npx babel-node src/dbPatches/populateTxStatusColumn.js 5000`)
      process.exit(1)
    }

    BATCH_SIZE = parsedBatchSize
  }

  console.log('')
  console.log(`Tx status column db patch started. Batch size: ${BATCH_SIZE}`)

  try {
    const query = {
      where: {
        status: null
      },
      select: {
        [cursorField]: true,
        hash: true,
        blockNumber: true,
        blockHash: true,
        receipt: true,
        status: true
      },
      take: BATCH_SIZE,
      orderBy: {
        txId: 'desc'
      }
    }

    // Initial fetch
    const transactions = await prismaClient.transaction.findMany(query)

    // No txs
    if (!transactions.length) {
      console.log('No transactions to update')
      process.exit(0)
    }

    // Process first batch
    await updateTransactionsStatus(transactions)

    // Next batches
    const initialCursorTx = transactions[transactions.length - 1]
    let cursor = initialCursorTx[cursorField]

    console.log(`New batch at tx: ${initialCursorTx.hash} (block ${initialCursorTx.blockNumber})`)

    while (cursor) {
      const query = {
        where: {
          [cursorField]: {
            lte: cursor
          },
          status: null
        },
        select: {
          [cursorField]: true,
          hash: true,
          blockNumber: true,
          blockHash: true,
          receipt: true,
          status: true
        },
        take: BATCH_SIZE + 1,
        orderBy: {
          [cursorField]: 'desc'
        }
      }

      const txs = await prismaClient.transaction.findMany(query)
      const hasMore = txs.length === BATCH_SIZE + 1

      if (hasMore) {
        const txsToProcess = txs.slice(0, BATCH_SIZE)
        await updateTransactionsStatus(txsToProcess)

        const cursorTx = txs[BATCH_SIZE]
        cursor = cursorTx[cursorField]

        console.log(`New batch at tx: ${cursorTx.hash} (block ${cursorTx.blockNumber})`)
      } else {
        console.log(`Processing last batch...`)
        await updateTransactionsStatus(txs)
        cursor = null
      }
    }

    console.log('Done')
    process.exit(0)
  } catch (error) {
    console.error('An error ocurred while updating transactions status')
    console.error(error)
    process.exit(1)
  }
}

async function updateTransactionsStatus (txs) {
  const updates = txs.map(tx => {
    const receipt = JSON.parse(tx.receipt)
    const status = receipt.status

    return prismaClient.transaction.update({
      where: { hash: tx.hash },
      data: { status }
    })
  })

  try {
    await prismaClient.$transaction(updates)
    console.log(`Updated ${txs.length} transactions successfully.`)
  } catch (error) {
    console.error(`Error updating batch of ${txs.length} transactions.`)
    console.error(error)
    console.log('Falling back to one-by-one updates...')
    await updateTransactionsOneByOne(txs)
  }
}

async function updateTransactionsOneByOne (txs) {
  for (const tx of txs) {
    try {
      const receipt = JSON.parse(tx.receipt)
      const status = receipt.status

      await prismaClient.transaction.update({
        where: { hash: tx.hash },
        data: { status }
      })

      console.log(`Updated tx ${tx.hash} (block ${tx.blockNumber})`)
    } catch (error) {
      console.log(`An error occurred while updating tx ${tx.hash} (block ${tx.blockNumber})`)
      console.error(error)
    }
  }
}

main()

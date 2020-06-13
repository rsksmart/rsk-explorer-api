import dataSource from '../lib/dataSource.js'
import { getDbBlocksCollections } from '../lib/blocksCollections'
import fs from 'fs'
import path from 'path'
import util from 'util'

import { checkBlocksCongruence, checkBlocksTransactions } from '../services/classes/CheckBlocks'

const checkTxs = process.argv.find((a) => a === '--txs')
const checkBlocks = process.argv.find((a) => a === '--blocks')
if (!checkTxs && !checkBlocks) {
  console.log('Usage:')
  console.log(`${process.argv[0]} ${process.argv[1]} [--blocks][--txs] [--out dir]`)
  console.log('--blocks search for missing blocks')
  console.log('--txs:  search for missing transactions')
  console.log('--out:  path to save results')
  process.exit(0)
}
const out = process.argv.findIndex((a) => a === '--out')
const outDir = out ? fs.existsSync(process.argv[out + 1]) ? path.resolve(process.argv[out + 1]) : path.resolve('./') : null
const writeFile = util.promisify(fs.writeFile)

dataSource({ skipCheck: true }).then(async ({ db }) => {
  try {
    const { Blocks, Txs } = getDbBlocksCollections(db)
    console.log('Getting blocks....')
    let res = await checkBlocksCongruence(Blocks)
    console.log(JSON.stringify(res, null, 2))
    if (checkTxs) {
      res.missingTxs = await checkBlocksTransactions(Blocks, Txs)

      res.missingTotal = res.missing.length
      res.invalidTotal = res.invalid.length
      res.missingTxsTotal = res.missingTxs.length

      console.log(`Missing Blocks: ${res.missingTotal}`)
      console.log(`Invalid Blocks: ${res.invalidTotal}`)
      console.log(`Blocks with missing txs: ${res.missingTxsTotal} `)
    }
    if (out > 1) {
      const outFile = `${outDir}/blocksLog-${Date.now()}.json`
      await writeFile(outFile, JSON.stringify(res))
      console.log(`Log saved on: ${outFile} `)
    }
    process.exit(0)
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
})

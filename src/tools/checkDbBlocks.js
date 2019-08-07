import dataSource from '../lib/dataSource.js'
import conf from '../lib/config'
import fs from 'fs'
import util from 'util'
import { checkBlocksCongruence, checkBlocksTransactions } from '../services/classes/CheckBlocks'
const config = Object.assign({}, conf.blocks)
const writeFile = util.promisify(fs.writeFile)
const outFile = process.argv[2] || '/tmp/blocksLog.json'
dataSource({ skipCheck: true }).then(async ({ db }) => {
  try {
    const Blocks = db.collection(config.collections.Blocks)
    const Txs = db.collection(config.collections.Txs)
    console.log('Getting blocks....')
    let res = await checkBlocksCongruence(Blocks)
    res.missingTxs = await checkBlocksTransactions(Blocks, Txs)

    res.missingTotal = res.missing.length
    res.invalidTotal = res.invalid.length
    res.missingTxsTotal = res.missingTxs.length

    console.log(`Missing Blocks:  ${res.missingTotal}`)
    console.log(`Invalid Blocks: ${res.invalidTotal}`)
    console.log(`Blocks with missing txs: ${res.missingTxsTotal}`)

    await writeFile(outFile, JSON.stringify(res))
    console.log(`Log saved on: ${outFile}`)
    process.exit(0)
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
})

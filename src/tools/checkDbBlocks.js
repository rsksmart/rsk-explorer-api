import dataSource from '../lib/dataSource.js'
import conf from '../lib/config'
import fs from 'fs'
import util from 'util'
import { checkBlocksCongruence } from '../services/classes/CheckBlocks'
const config = Object.assign({}, conf.blocks)
const writeFile = util.promisify(fs.writeFile)
const outFile = '/tmp/blocksLog.json'
dataSource.then(async db => {
  try {
    const Blocks = db.collection(config.collections.Blocks)
    console.log('Getting blocks....')
    let res = await checkBlocksCongruence(Blocks)
    res.missingTotal = res.missing.length
    res.invalidTotal = res.invalid.length
    console.log(`Missing Blocks:  ${res.missingTotal}`)
    console.log(`Invalid Blocks: ${res.invalidTotal}`)
    await writeFile(outFile, JSON.stringify(res))

    console.log(`Log saved on: ${outFile}`)
    process.exit(0)
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
})

import dataSource from '../lib/dataSource.js'
import { deleteBlockDataFromDb, getBlockFromDb } from '../services/classes/Block'
import { deleteBlockSummaryFromDb, getBlockSummariesByNumber } from '../services/classes/BlockSummary'
import { BlocksBase } from '../lib/BlocksBase'
import { info, orange, reset, error, ansiCode } from '../lib/cli'

dataSource({ skipCheck: true }).then(async ({ db }) => {
  const options = new BlocksBase(db)
  const { collections } = options
  const p = path => path.split('/').pop()
  const help = () => {
    const myName = p(process.argv[1])
    info(`Use: ${p(process.argv[0])} ${myName} [blockNumber] | [fromBlock-toBlock]`)
    info(`e.g. ${orange} ${myName} 400`)
    info(`e.g. ${orange} ${myName} 400-456`)
    process.exit(0)
  }

  let fromTo = process.argv[2]
  let deleteSummary = process.argv.find(x => x === '--deleteSummary')
  if (!fromTo) help()
  fromTo = fromTo.split('-')
  let [f, t] = fromTo

  if (!f) help()
  if (!t) t = f
  if (isNaN(f) || isNaN(t)) help()
  if (f > t) help()

  try {
    let Q = []
    while (t >= f) {
      let b = await getBlockFromDb(t, collections.Blocks)
      let color = ansiCode(Number(t.toString().split('').pop()) + 30)
      if (b) {
        let { hash, number } = b
        console.log(`${reset} ${color} ● ● ● Removing block  ${number} ${hash}`)
        Q.push(deleteBlockDataFromDb(b.hash, number, collections))
      }
      if (deleteSummary) {
        if (b) {
          Q.push(deleteBlockSummaryFromDb(b.hash, options.collections))
        } else {
          console.log(`${reset} ${color} ● ● ● Removing ALL summaries for blockNumber: ${t}`)
          let summaries = await getBlockSummariesByNumber(t, collections)
          if (summaries.length) {
            for (let summary of summaries) {
              Q.push(deleteBlockSummaryFromDb(summary.hash, collections))
            }
          }
        }
      }
      t--
    }
    Promise.all(Q).then(() => process.exit())
  } catch (err) {
    error(err)
  }
})

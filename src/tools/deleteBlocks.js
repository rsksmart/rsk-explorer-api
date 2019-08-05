import dataSource from '../lib/dataSource.js'
import { deleteBlockDataFromDb, getBlockFromDb } from '../services/classes/Block'
import { BlocksBase } from '../lib/BlocksBase'
import { info, orange, reset, error, ansiCode } from '../lib/cli'

dataSource.then(async ({ db }) => {
  const options = new BlocksBase(db)
  const p = path => path.split('/').pop()
  const help = () => {
    const myName = p(process.argv[1])
    info(`Use: ${p(process.argv[0])} ${myName} [blockNumber] | [fromBlock-toBlock]`)
    info(`e.g. ${orange} ${myName} 400`)
    info(`e.g. ${orange} ${myName} 400-456`)
    process.exit(0)
  }

  let fromTo = process.argv[2]
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
      let b = await getBlockFromDb(t, options.collections.Blocks)
      if (b) {
        let number = b.number
        let color = ansiCode(Number(number.toString().split('').pop()) + 30)
        console.log(`${reset} ${color} ● ● ● Removig block  ${number} ${b.hash}`)
        Q.push(deleteBlockDataFromDb(b.hash, number, options.collections))
      }
      t--
    }
    Promise.all(Q).then(() => process.exit())
  } catch (err) {
    error(err)
  }
})

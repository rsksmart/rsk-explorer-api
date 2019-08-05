import dataSource from '../lib/dataSource.js'
import conf from '../lib/config'
const config = Object.assign({}, conf.blocks)
dataSource.then(async ({ db }) => {
  try {
    const Addrs = db.collection(config.collections.Addrs)
    let result = await Addrs.find({ createdByTx: { $exists: true }, type: 'account' })
      .project({ address: 1, type: 1, _id: 0 })
      .toArray()
    if (result) {
      result = result.map(r => r.address)
      console.log(JSON.stringify(result))
    } else {
      console.log('No results')
    }
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
})

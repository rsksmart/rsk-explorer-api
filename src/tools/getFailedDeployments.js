import dataSource from '../lib/dataSource.js'
import conf from '../lib/config'
import { addressRepository } from '../repositories/address.repository.js'

const config = Object.assign({}, conf.blocks)
dataSource({ skipCheck: true }).then(async ({ db }) => {
  try {
    const Addrs = db.collection(config.collections.Addrs)
    const query = { createdByTx: { $exists: true }, type: 'account' }
    const project = { address: 1, type: 1, _id: 0 }

    let result = await addressRepository.find(query, project, Addrs)
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

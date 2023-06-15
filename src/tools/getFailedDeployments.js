import dataSource from '../lib/dataSource.js'
import { addressRepository } from '../repositories/address.repository.js'

dataSource({ skipCheck: true }).then(async () => {
  try {
    const query = { createdByTx: { $exists: true }, type: 'account' }
    const project = { address: 1, type: 1, id: 0 }

    let result = await addressRepository.find(query, project)
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

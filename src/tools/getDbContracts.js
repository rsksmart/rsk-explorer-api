import dataSource from '../lib/dataSource.js'
import { addressRepository } from '../repositories/address.repository'

dataSource({ skipCheck: true }).then(({ db }) => {
  const addresses = db.collection('addresses')

  const query = { type: 'contract' }
  const project = { _id: 0, address: 1 }

  addressRepository.find(query, project, addresses)
    .then(res => {
      console.log(JSON.stringify(res))
      process.exit(0)
    }
    )
})

import dataSource from '../lib/dataSource.js'
import { REPOSITORIES } from '../repositories/index.js'

const { Address: addressRepository } = REPOSITORIES

dataSource({ skipCheck: true }).then(() => {
  const query = { type: 'contract' }
  const project = { id: 0, address: 1 }

  addressRepository.find(query, project)
    .then(res => {
      console.log(JSON.stringify(res))
      process.exit(0)
    }
    )
})

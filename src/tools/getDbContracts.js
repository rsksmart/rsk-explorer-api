import dataSource from '../lib/dataSource.js'

dataSource.then(({ db }) => {
  let addresses = db.collection('addresses')
  addresses.find({ type: 'contract' })
    .project({ _id: 0, address: 1 })
    .toArray()
    .then(res => {
      console.log(JSON.stringify(res))
      process.exit(0)
    }
    )
})

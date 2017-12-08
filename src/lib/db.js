const mongodb = require('mongodb')

/* class Connect {
  constructor(url) {
    this.url = url
    this.connection = null
    this.connect = function() {
      if (!this.connection) {
        mongodb.MongoClient.connect(this.url).then(() => {
          this.connection = 'test'
          return this.connection
        })
      } else {
        return this.connection
      }
    }
  }
}

let connection = new Connect('mongodb://localhost:27017/blockDB')
console.log(connection.connect()) */

async function test() {
  const client = await mongodb.MongoClient.connect(
    'mongodb://localhost:27017/blockDB'
  )
  const db = client.db('blockDB')
  const collection = db.collection('blocks')
  let x = await collection
    .find()
    .sort({ number: -1 })
    .limit(1)
    .stream()

  x.on('data', doc => {
    console.log(doc.number)
  })
}

test()

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

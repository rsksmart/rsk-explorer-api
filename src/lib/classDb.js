import { MongoClient } from 'mongodb'

class Db {
  constructor(server, port, dbName) {
    this.server = server
    this.port = port
    this.dbName = dbName
    this.url = 'mongodb://' + this.server + ':' + this.port + '/' + this.db
    this.client = null

    this.connect = function() {
      if (!this.client) this.client = MongoClient.connect(this.url)
      return this.client
    }

    this.db = async function() {
      let client = await this.connect()
      let db = await client.db(this.dbName)
      return db
    }


    this.connect()
  }
}

export default Db

/* //let connection = new Connect('mongodb://localhost:27017/blockDB')
//console.log(connection.connect())

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

test() */

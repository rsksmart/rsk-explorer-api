import { dataBase } from '../../lib/dataSource.js'
import config from '../../lib/config'
import * as utils from '../../lib/utils.js'
import { randomColor, reset } from '../../lib/cli'

dataBase.db().then(async db => {
  try {
    console.log('Rewriting data')
    await reformatBigNumbers(db, Object.values(config.blocks.collections))
  } catch (err) {
    console.error(err)
  }
})

async function reformatBigNumbers (db, collections) {
  collections.forEach(async colName => {
    let collection = db.collection(colName)
    let fields = await getBnFields(collection)
    if (fields.length) {
      console.log(`Updating collection: ${colName}`)
      collection.find({}).forEach(async doc => {
        let id = doc._id
        doc = updateBnFields(fields, doc)
        await collection.update({ _id: id }, { $set: doc })
          .then(res => {
            let color = randomColor()
            console.log(`${reset}${color} ${colName}:${id} updated!`)
          })
          .catch(err => {
            console.log(`Error updating ${colName}: ${id}`)
            console.log(err)
          })
      })
    }
  })
}

async function getBnFields (collection) {
  let reg = await collection.findOne({})
  let fields = []
  for (let field in reg) {
    let value = reg[field]
    if (value && utils.isSerializedBigNumber(value)) fields.push(field)
  }
  return fields
}
function updateBnFields (fields, doc) {
  let newDoc = {}
  fields.forEach(f => {
    let value = doc[f]
    if (value) {
      value = utils.unSerializeBigNumber(value)
      value = utils.serializeBigNumber(value)
    }
    newDoc[f] = value
  })
  return newDoc
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

'use strict';var _dataSource = require('../../lib/dataSource.js');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _utils = require('../../lib/utils.js');var utils = _interopRequireWildcard(_utils);
var _cli = require('../../lib/cli');function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

_dataSource.dataBase.db().then(async db => {
  try {
    console.log('Rewriting data');
    await reformatBigNumbers(db, Object.values(_config2.default.blocks.collections));
  } catch (err) {
    console.error(err);
  }
});

async function reformatBigNumbers(db, collections) {
  collections.forEach(async colName => {
    let collection = db.collection(colName);
    let fields = await getBnFields(collection);
    if (fields.length) {
      console.log(`Updating collection: ${colName}`);
      collection.find({}).forEach(async doc => {
        let id = doc._id;
        doc = updateBnFields(fields, doc);
        await collection.update({ _id: id }, { $set: doc }).
        then(res => {
          let color = (0, _cli.randomColor)();
          console.log(`${_cli.reset}${color} ${colName}:${id} updated!`);
        }).
        catch(err => {
          console.log(`Error updating ${colName}: ${id}`);
          console.log(err);
        });
      });
    }
  });
}

async function getBnFields(collection) {
  let reg = await collection.findOne({});
  let fields = [];
  for (let field in reg) {
    let value = reg[field];
    if (value && utils.isSerializedBigNumber(value)) fields.push(field);
  }
  return fields;
}
function updateBnFields(fields, doc) {
  let newDoc = {};
  fields.forEach(f => {
    let value = doc[f];
    if (value) {
      value = utils.unSerializeBigNumber(value);
      value = utils.serializeBigNumber(value);
    }
    newDoc[f] = value;
  });
  return newDoc;
}

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
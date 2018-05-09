import DB from './Db.js'
import config from './config'
const db = new DB(config.db)

export default db.db()

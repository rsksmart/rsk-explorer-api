import DB from './classDb'
import config from './config'
const db = new DB(config.db.server, config.db.port, config.db.database)

export default db.db()

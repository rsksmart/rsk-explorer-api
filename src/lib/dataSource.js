import DB from './Db.js'
import config from './config'
export const dataBase = new DB(config.db)
export const dataSource = dataBase.db()
export default dataSource

import { LogProxy } from './Logger'
export class Db {
  constructor (config) {
    config = config || {}
    const { server, port, password, user, database } = config
    this.server = server || 'localhost'
    this.port = port || 27017
    this.dbName = database
    if (!this.dbName) throw new Error('Missing database name')
    let url = 'mongodb://'
    if (user && password) url += `${user}:${password}@`
    url += `${this.server}:${this.port}/${this.dbName}`
    this.url = url
    this.client = null
    this.log = undefined
    this.DB = undefined
    this.setLogger(config.Logger || console)
    this.connect()
  }
  async connect () {
    try {
      if (!this.client) {
      }
      return this.client
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async db () {
    try {
      if (this.DB) return this.DB
      let client = await this.connect()
      this.DB = client.db(this.dbName)
      return this.DB
    } catch (err) {
      return Promise.reject(err)
    }
  }

  setLogger (log) {
    this.log = (log && log.constructor && log.constructor.name === 'Logger') ? log : LogProxy(log)
  }

  getLogger () {
    return this.log
  }

  insertMsg (insertResult, data, dataType) {
    let count = (data) ? data.length : null
    let msg = ['Inserted', insertResult.result.n]
    if (count) {
      msg.push('of')
      msg.push(count)
    }
    if (dataType) msg.push(dataType)
    return msg.join(' ')
  }
}
export default Db

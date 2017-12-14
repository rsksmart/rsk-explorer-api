import { EventEmitter } from 'events'
const emitter = new Emitter()

class Data {
  constructor(db) {
    this.db = db
    this.events = emitter
    this.init = () => {}
    // paginator
    this.paginator = (query, params) => {
      return this.db.count(query).then(total => {
        let pages = Math.ceil(total / params.limit)
        return { total, pages }
      })
    }
    // get pages
    this.getPages = (query, params) => {
      let perPage = params.limit
      let page = params.page || 1

      return this.db.count(query).then(total => {
        let pages = Math.ceil(total / perPage)
        page = page * perPage < total ? page : pages
        let skip = (page - 1) * perPage
        return { page, total, pages, perPage, skip }
      })
    }
    setInterval(() => {
      this.init()
    }, 1000)
  }
}

export default Data

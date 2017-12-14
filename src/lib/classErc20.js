import config from './config'
const perPage = config.api.perPage
import { filterParams } from './utils'

class Erc20 {
  constructor(db) {
    this.db = db
    this.tokenCollection = this.db.collection(config.erc20.tokenCollection)
    this.tokenList = []
    this.tokens = {}
    this.filterParams = filterParams
    this.updateTokens()
  }

  getTokens() {
    return this.tokenList
  }

  getTokenAction(action, params) {
    return new Promise((resolve, reject) => {
      if (!params) reject('No params provided')
      let address = params.address
      if (action && address) {
        let token = this.tokens[address]
        if (token) {
          let method = token.actions[action]
          if (method) {
            params = this.filterParams(perPage, params)
            resolve(method(params))
          }
        }
      }
      reject('Unknown token action or bad params requested')
    })
  }

  updateTokens() {
    this.tokenCollection.find().toArray((err, docs) => {
      if (err) {
        console.log(err)
      } else {
        this.tokenList = docs
        for (let token of docs) {
          let address = token.address
          if (!this.tokens[address]) {
            let collection = this.db.collection(
              config.erc20.dbPrefix + token.address
            )
            this.tokens[address] = new Token(collection, address)
          }
        }
      }
    })
  }
}
class Token {
  constructor(db, address) {
    this.db = db
    this.address = address

    this.actions = {
      getEvent: params => {
        if (!params._id) return
        return this.db.findOne({ _id: params._id })
      },
      getEvents: params => {
        let query = { balance: { $exists: false } }
        return this.getPages(query, params).then(PAGES => {
          return this.db
            .find(query)
            .sort({ timestamp: -1 })
            .skip(PAGES.skip)
            .limit(PAGES.perPage)
            .toArray()
            .then(DATA => {
              return { PAGES, DATA }
            })
        })
      },
      getAccount: params => {
        let account = params.account
        let offset = 0
        let query = {
          $or: [{ 'args._from': account }, { 'args._to': account }]
        }
        return this.db.findOne({ _id: account }).then(balance => {
          return this.getPages(query, params).then(PAGES => {
            return this.db
              .find(query)
              .sort({ timestamp: -1 })
              .skip(PAGES.skip)
              .limit(PAGES.perPage)
              .toArray()
              .then(account => {
                let DATA = { balance, account }
                return { DATA, PAGES }
              })
          })
        })
      },
      getAccounts: params => {
        let offset = 0
        let query = { balance: { $exists: true } }

        return this.getPages(query, params).then(PAGES => {
          return this.db
            .find(query)
            .sort({ _id: 1 })
            .skip(offset)
            .limit(50)
            .toArray()
            .then(DATA => {
              return { PAGES, DATA }
            })
        })
      },
      searchByAddress: params => {}
    }
  }
  getPages(query, params) {
    let perPage = params.limit
    let page = params.page || 1

    return this.db.count(query).then(total => {
      let pages = Math.ceil(total / perPage)
      page = page * perPage < total ? page : pages
      let skip = (page - 1) * perPage
      return { page, total, pages, perPage, skip }
    })
  }
}
export default Erc20

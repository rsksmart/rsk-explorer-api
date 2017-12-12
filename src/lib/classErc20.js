import config from './config'
const perPage = config.api.perPage
import { filterParams } from './utils'

class Erc20 {
  constructor(db) {
    this.db = db
    this.tokenCollection = db.collection(config.erc20.tokenCollection)
    this.tokenList = []
    this.tokens = {}
    this.filterParams = filterParams

    this.getTokens = () => {
      return this.tokenList
    }

    this.getTokenAction = (action, params) => {
      return new Promise((resolve, reject) => {
        if (!params) reject('No params')
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
    this.updateTokens = () => {
      this.tokenCollection.find().toArray((err, docs) => {
        if (err) {
          console.log(err)
        } else {
          this.tokenList = docs
          for (let token of docs) {
            let address = token.address
            if (!this.tokens[address]) {
              let collection = db.collection(
                config.erc20.dbPrefix + token.address
              )
              this.tokens[address] = new Token(collection, address)
            }
          }
        }
      })
    }
    this.updateTokens()
  }
}
export class Token {
  constructor(db, address) {
    this.db = db
    this.address = address
    this.paginator = (query, params) => {
      return this.db.count(query).then(total => {
        let pages = Math.ceil(total / params.limit)
        return { total, pages }
      })
    }
    this.actions = {
      getEvent: params => {
        if (!params._id) return
        return db.findOne({ _id: params._id })
      },
      getEvents: params => {
        let query = { balance: { $exists: false } }
        return this.paginator(query, params).then(totals => {
          return this.db
            .find(query)
            .sort({ timestamp: -1 })
            .skip(0)
            .limit(50)
            .toArray()
            .then(data => {
              return { totals, data }
            })
        })
      },
      getAccount: params => {
        let account = params.account
        let offset = 0
        return this.db.findOne({ _id: account }).then(balance => {
          return this.db
            .find({ $or: [{ 'args._from': account }, { 'args._to': account }] })
            .sort({ timestamp: -1 })
            .skip(offset)
            .limit(50)
            .toArray()
            .then(account => {
              return { balance, account }
            })
        })
      },
      getAccounts: params => {
        let offset = 0
        let query = { balance: { $exists: true } }

        return this.paginator(query, params).then(totals => {
          return this.db
            .find(query)
            .sort({ _id: 1 })
            .skip(offset)
            .limit(50)
            .toArray()
            .then(data => {
              return { totals, data }
            })
        })
      },
      searchByAddress: params => {}
    }
  }
}
export default Erc20

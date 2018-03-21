import Web3 from 'web3'
import Logger from '../../lib/Logger'

class Exporter {
  constructor(config, db) {
    this.config = config
    this.db = db

    this.web3 = new Web3()
    this.web3.setProvider(config.provider)

    const logName = this.config.name || 'Erc20-' + this.config.tokenShortName
    this.log = Logger(logName)

    this.fromBlock = this.config.exportStartBlock || 0
    this.toBlock = this.config.exportEndBlock || 'latest'
    this.logTag = this.config.tokenShortName || this.config.tokenAddress

    this.contract = this.web3.eth
      .contract(this.config.erc20ABI)
      .at(this.config.tokenAddress)
    this.allEvents = this.contract.allEvents({
      fromBlock: this.toBlock,
      toBlock: this.toBlock
    })
    this.newEvents = this.contract.allEvents()

    // Processes new events
    this.newEvents.watch((err, log) => {
      if (err) {
        this.log.warn(this.logTag, 'Error receiving new log:', err)
        return
      }
      this.log.debug(this.logTag, 'New log received:', log)

      this.processLog(log, err => {
        this.log.debug(this.logTag, 'New log processed')
      })

      if (log.event === 'Transfer') {
        this.exportBalance(log.args._from)
        this.exportBalance(log.args._to)
      }
      if (log.event === 'Approval') {
        this.exportBalance(log.args._owner)
        this.exportBalance(log.args._spender)
      }
    })

    // Retrieves historical events and processed them
    this.allEvents.get((err, logs) => {
      this.log.info(this.logTag, 'Historical events received')
      if (err) {
        this.log.warn(this.logTag, 'Error receiving historical events:', err)
        return
      }
      let accounts = {}

      logs.forEach(log => {
        if (log.event === 'Transfer') {
          accounts[log.args._from] = log.args._from
          accounts[log.args._to] = log.args._to
        }

        if (log.event === 'Approval') {
          accounts[log.args._owner] = log.args._owner
          accounts[log.args._spender] = log.args._spender
        }
      })
      this.batchLogs(logs).then(() => {
        this.log.info(this.logTag, 'All historical logs processed')
        this.exportBatchAccounts(accounts).then(() => {
          this.log.info(this.logTag, 'All historical balances updated')
        })
      })
    })

    this.batchLogs = async logs => {
      for (let log of logs) {
        try {
          await this.processLog(log)
        } catch (err) {
          this.log.warn(this.logTag, 'Error, processing logs', err)
        }
      }
    }

    this.exportBatchAccounts = async accounts => {
      for (let a in accounts) {
        try {
          await this.exportBalance(accounts[a])
        } catch (err) {
          this.log.warn(this.logTag, 'Errror exporting balance', err)
        }
      }
    }

    this.processLog = (log, callback) => {
      log._id =
        log.blockNumber + '_' + log.transactionIndex + '_' + log.logIndex
      this.log.info(this.logTag, 'Exporting log:', log._id)

      this.web3.eth.getBlock(log.blockNumber, false, (err, block) => {
        if (err) {
          this.log.warn(
            this.logTag,
            'Error retrieving block information for log:',
            err
          )
          if (callback) callback()
          return
        }

        log.timestamp = block.timestamp

        if (log.args && log.args._value) {
          log.args._value = parseFloat(log.args._value)
        }

        this.db.insert(log, (err, newLogs) => {
          if (err) {
            if (err.code === 11000) {
              this.log.debug(
                this.logTag,
                log._id,
                'already exported!',
                err.message
              )
            } else {
              this.log.warn(this.logTag, 'Error inserting log:', err)
            }
          }
          if (callback) callback()
        })
      })
    }

    this.exportBalance = (address, callback) => {
      this.log.info(this.logTag, 'Exporting balance of', address)
      this.contract.balanceOf(address, (err, balance) => {
        balance = parseFloat(balance)
        let doc = { _id: address, balance: balance }
        this.db.update(
          { _id: doc._id },
          doc,
          { upsert: true },
          (err, numReplaced) => {
            if (err) {
              this.log.warn(this.logTag, 'Error updating balance:', err)
            } else {
              this.log.info(this.logTag, 'Balance export completed')
            }

            if (callback) callback()
          }
        )
      })
    }

    this.log.info(
      this.logTag,
      'Exporter initialized, waiting for historical events...'
    )
  }
}

export default Exporter

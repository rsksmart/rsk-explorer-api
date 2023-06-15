import { BcThing } from './BcThing'
import BlockSummary from './BlockSummary'
import { blockQuery, isBlockHash, isValidBlockNumber } from '../../lib/utils'
import { getBlockchainStats } from '../../lib/getBlockchainStats'
import { blockRepository } from '../../repositories/block.repository'
import { txRepository } from '../../repositories/tx.repository'
import { eventRepository } from '../../repositories/event.repository'
import { statsRepository } from '../../repositories/stats.repository'
import { fetchAddressesBalancesFromNode } from './BlockBalances'

export class Block extends BcThing {
  constructor (hashOrNumber, { nod3, log, initConfig }, status) {
    super({ nod3, initConfig, log })
    this.fetched = false
    this.log = log || console
    this.hashOrNumber = hashOrNumber
    this.summary = new BlockSummary(hashOrNumber, { nod3, initConfig, log })
    this.data = { block: null }
    this.status = status
  }

  async fetch (forceFetch) {
    try {
      if (this.fetched && !forceFetch) {
        return this.getData()
      }
      let { summary } = this
      let data = await summary.fetch()
      this.setData(data)
      this.fetched = true
      return this.getData()
    } catch (err) {
      this.log.debug('Block fetch error', err)
      return Promise.reject(err)
    }
  }

  async save (overwrite) {
    try {
      let { hashOrNumber } = this
      // Skip saved blocks
      if (isBlockHash(hashOrNumber) && !overwrite) {
        const hash = hashOrNumber
        const exists = await blockRepository.findOne({ hash }, {})
        if (exists) throw new Error(`Block ${hash} skipped`)
      } else if (isValidBlockNumber(hashOrNumber)) {
        const number = hashOrNumber
        const exists = await blockRepository.findOne({ number }, {})
        if (exists) throw new Error(`Block ${number} skipped`)
      }
      await this.fetch()
      let data = this.getData(true)
      if (!data) throw new Error(`Fetch returns empty data for block #${this.hashOrNumber}`)

      data.balances = await fetchAddressesBalancesFromNode(data.addresses, data.block, this.nod3)
      data.status = this.status

      await blockRepository.saveBlockData(data)

      // save stats (requires blocks and addresses inserted)
      const blockchainStats = await getBlockchainStats({ blockHash: data.block.hash, blockNumber: data.block.number })
      await statsRepository.insertOne(blockchainStats)

      return { data }
    } catch (err) {
      console.log(err)
      return Promise.reject(err)
    }
  }

  searchBlock ({ hash, number }) {
    return blockRepository.find({ $or: [{ hash }, { number }] })
  }

  async getBlockFromDb (hashOrNumber, allData) {
    try {
      let block = await getBlockFromDb(hashOrNumber)
      if (block && allData) block = await this.getBlockDataFromDb(block)
      return block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getBlockDataFromDb (block) {
    try {
      if (!block || !block.hash) throw new Error(`Invalid block: ${block}`)
      let blockHash = block.hash
      block = { block }
      await Promise.all([
        this.getBlockTransactionsFromDb(blockHash).then(txs => { block.txs = txs }),
        this.getBlockEventsFromDb(blockHash).then(events => { block.events = events })
      ])
      return block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getBlockEventsFromDb (blockHash) {
    return eventRepository.find({ blockHash }, {})
  }

  getBlockTransactionsFromDb (blockHash) {
    return eventRepository.find({ blockHash }, {})
  }

  getTransactionFromDb (hash) {
    return txRepository.findOne({ hash }, {})
  }

  // adds contract data to addresses
  mergeContractsAddresses () {
    let contracts = this.data.contracts
    contracts.forEach(contract => {
      let address = contract.address
      let Addr = this.addresses[address]
      if (Addr) {
        for (let prop in contract) {
          if (prop !== 'addresses') Addr.setData(prop, contract[prop])
        }
      }
    })
  }
  async fetchContractsAddresses () {
    let data = []
    for (let c in this.contracts) {
      let contract = this.contracts[c]
      let addData = await contract.fetchAddresses()
      if (addData.length) data = data.concat(addData)
    }
    return data
  }
}

export const getBlockFromDb = async (blockHashOrNumber) => {
  let query = blockQuery(blockHashOrNumber)
  if (query) return blockRepository.findOne(query, {})
  return Promise.reject(new Error(`"${blockHashOrNumber}": is not block hash or number`))
}

export default Block

import { BcThing } from './BcThing'
import BlockSummary from './BlockSummary'
import { blockQuery } from '../../lib/utils'
import { getBlockchainStats } from '../../lib/getBlockchainStats'
import { blockRepository } from '../../repositories/block.repository'
import { txRepository } from '../../repositories/tx.repository'
import { eventRepository } from '../../repositories/event.repository'
import { statsRepository } from '../../repositories/stats.repository'
import { fetchAddressesBalancesFromNode } from './BlockBalances'

export class Block extends BcThing {
  constructor (number, { nod3, log, initConfig }, status) {
    super({ nod3, initConfig, log })
    this.fetched = false
    this.log = log || console
    this.number = number
    this.summary = new BlockSummary(number, { nod3, initConfig, log })
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

  async save () {
    try {
      const { number } = this
      console.log({ number })
      if (number < 0) throw new Error(`Invalid block number: ${number}`)
      const exists = await blockRepository.findOne({ number })
      if (exists) throw new Error(`Block ${number} already in db. Skipped`)

      await this.fetch()
      let data = this.getData(true)
      if (!data) throw new Error(`Fetch returns empty data for block #${number}`)

      data.balances = await fetchAddressesBalancesFromNode(data.addresses, data.block, this.nod3)
      data.status = this.status

      // save block and all related data
      await blockRepository.saveBlockData(data)

      // save stats (requires blocks and addresses inserted)
      const blockchainStats = await getBlockchainStats({ blockHash: data.block.hash, blockNumber: data.block.number })
      await statsRepository.insertOne(blockchainStats)

      return { data }
    } catch (err) {
      throw err
    }
  }

  searchBlock ({ hash, number }) {
    return blockRepository.find({ $or: [{ hash }, { number }] })
  }

  async getBlockFromDb (number, allData) {
    try {
      let block = await getBlockFromDb(number)
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

export const getBlockFromDb = async (number) => {
  let query = blockQuery(number)
  if (query) return blockRepository.findOne(query, {})
  return Promise.reject(new Error(`"${number}": is not block hash or number`))
}

export default Block

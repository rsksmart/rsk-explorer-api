import { BcThing } from './BcThing'
import BlockSummary from './BlockSummary'
import { blockQuery } from '../../lib/utils'
import { getBlockchainStats } from '../../lib/getBlockchainStats'
import { fetchAddressesBalancesFromNode } from './BlockBalances'
import { REPOSITORIES } from '../../repositories'
import { bitcoinRskNetWorks } from '../../lib/types'
import defaultConfig from '../../lib/defaultConfig'
export class Block extends BcThing {
  constructor (number, { nod3, log, initConfig }, status = null, tipBlock = false) {
    super({ nod3, initConfig, log, name: 'Blocks' })
    this.fetched = false
    this.log = log || console
    this.number = number
    this.summary = new BlockSummary(number, { nod3, initConfig, log })
    this.data = { block: null }
    this.status = status
    this.isTipBlock = tipBlock
    this.txRepository = REPOSITORIES.Tx
    this.eventRepository = REPOSITORIES.Event
    this.statsRepository = REPOSITORIES.Stats
    this.forceSaveBcStats = defaultConfig.forceSaveBcStats
  }

  async fetch (forceFetch) {
    try {
      if (this.fetched && !forceFetch) {
        return this.getData()
      }
      let { summary } = this
      let data = await summary.fetch()
      if (!data) throw new Error(`Fetch returns empty data for block #${this.number}`)
      this.setData(data)
      this.fetched = true
    } catch (err) {
      this.log.debug('Block fetch error', err)
    }
  }

  async save () {
    const { number, forceSaveBcStats } = this
    let data
    try {
      if (number < 0) throw new Error(`Invalid block number: ${number}`)

      const exists = await this.repository.findOne({ number })
      if (exists) throw new Error(`Block ${number} already in db. Skipped`)

      data = this.getData(true)
      const { balances, latestBalances } = await fetchAddressesBalancesFromNode(data.addresses, data.block, this.nod3)
      data.balances = balances
      data.latestBalances = latestBalances
      data.status = this.status

      // save block and all related data
      await this.repository.saveBlockData(data)

      // save blockchain stats. Only for tip blocks (requires block and addresses inserted)
      if (this.isTipBlock || forceSaveBcStats) {
        const blockchainStats = await getBlockchainStats({ bitcoinNetwork: bitcoinRskNetWorks[this.initConfig.net.id], blockHash: data.block.hash, blockNumber: data.block.number })
        await this.statsRepository.insertOne(blockchainStats)
      }
    } catch (error) {
      this.log.error(`Error saving block ${number} data`)
      throw error
    }
  }

  searchBlock ({ hash, number }) {
    return this.repository.find({ OR: [{ hash }, { number }] })
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
    return this.eventRepository.find({ blockHash }, {})
  }

  getBlockTransactionsFromDb (blockHash) {
    return this.eventRepository.find({ blockHash }, {})
  }

  getTransactionFromDb (hash) {
    return this.txRepository.findOne({ hash }, {})
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
  if (query) return this.repository.findOne(query, {})
  return Promise.reject(new Error(`"${number}": is not block hash or number`))
}

export default Block

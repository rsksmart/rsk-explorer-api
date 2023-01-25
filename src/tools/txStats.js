import dataSource from '../lib/dataSource.js'
import { getDbBlocksCollections } from '../lib/blocksCollections'
import { newBigNumber } from '../lib/utils'
import { txRepository } from '../repositories/tx.repository'
import { blockRepository } from '../repositories/block.repository'

const fromBlock = parseInt(process.argv[2])
const toBlock = parseInt(process.argv[3])
if (!fromBlock || !toBlock) help()
if (fromBlock > toBlock) help(`'fromBlock' must be less than 'toBlock'`)

const DATA = {
  txs: 0,
  gas: newBigNumber(0),
  gasPrice: newBigNumber(0),
  gasUsed: newBigNumber(0),
  fee: newBigNumber(0)
}
const accounts = {}

console.log(`from block: ${fromBlock} to block: ${toBlock}`)
getData(fromBlock, toBlock)

async function getData (fromBlock, toBlock) {
  try {
    let { db } = await dataSource()
    let collections = getDbBlocksCollections(db)
    let { Txs } = collections
    let query = {
      $and: [
        { blockNumber: { $gte: fromBlock } },
        { blockNumber: { $lte: toBlock } },
        { txType: { $ne: 'remasc' } }]
    }
    let cursor = txRepository.find(query, {}, Txs)
    DATA.txs = await txRepository.countDocuments(query, Txs)

    await cursor.forEach((tx) => {
      getTxData(tx)
    })
    printObj(DATA)
    printObj(accounts)
    console.log(`Accounts that sent txs: ${Object.keys(accounts).length}`)

    let fb = await getBlock(collections, fromBlock)
    let tb = await getBlock(collections, toBlock)
    let diff = getDiff(fb, tb)

    printObj(diff)

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

async function getBlock ({ Blocks }, number) {
  try {
    let query = { number }
    let data = await blockRepository.findOne(query, {}, Blocks)
    return data
  } catch (err) {
    return Promise.reject(err)
  }
}

function getTxData (tx) {
  let { gas, gasPrice, receipt, from } = tx
  let fromTxs = accounts[from] || 0
  accounts[from] = fromTxs + 1
  let { gasUsed } = receipt
  gas = newBigNumber(gas)
  gasPrice = toWei(gasPrice)
  gasUsed = newBigNumber(gasUsed)
  let fee = gasUsed.multipliedBy(gasPrice)
  DATA.gas = DATA.gas.plus(gas)
  DATA.gasPrice = DATA.gasPrice.plus(gasPrice)
  DATA.gasUsed = DATA.gasUsed.plus(gasUsed)
  DATA.fee = DATA.fee.plus(fee)
}

function getDiff (from, to) {
  let time = to.timestamp - from.timestamp
  let difficulty = newBigNumber(to.totalDifficulty).minus(newBigNumber(from.totalDifficulty))
  let hashrate = difficulty.dividedBy(newBigNumber(time))
  return { time, difficulty, hashrate }
}

function help (msg) {
  if (msg) console.error(`ERROR: ${msg}`)
  const myName = process.argv[1].split('/').pop()
  console.log('')
  console.log(`Usage:`)
  console.log(`node ${myName} [fromBlock] [toBlock]`)
  console.log(`Example: node ${myName} 100 200`)
  console.log('')
  process.exit(0)
}

function toWei (value) {
  return newBigNumber(value).dividedBy(newBigNumber(10 ** 18))
}

function printObj (obj) {
  let o = Object.assign({}, obj)
  for (let p in o) {
    o[p] = o[p].toString(10)
  }
  console.log(JSON.stringify(o, null, 2))
}

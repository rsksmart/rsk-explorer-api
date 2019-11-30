import { isTxOrBlockHash, isBlockHash } from './utils'

const checkNumbers = payload => {
  for (let name in payload) {
    let number = payload[name]
    if (isNaN(number)) throw new Error(`${name} is not a number`)
  }
}

const padBlockNumber = number => number.toString(16).padStart(7, 0)

/**
 * Generates sortable and immutable ids for txs and events
 * id structure:
 * [blockNumber](24b)
 * [txIndex][16b]
 * [index](optional)(16b)
 * [blockHash|txHash][72b]
 */

export const generateId = ({ blockNumber, transactionIndex, hash, index }) => {
  try {
    if (!hash) throw new Error(`Invalid hash ${hash}`)
    hash = hash.toLowerCase()
    checkNumbers({ blockNumber, transactionIndex })
    if (!isTxOrBlockHash(hash)) throw new Error('blockHash is not a block hash')

    let block = padBlockNumber(blockNumber)
    let txI = transactionIndex.toString(16).padStart(3, 0)
    let hashBit = hash.substr(-19, 19)
    index = parseInt(index)
    index = (isNaN(index)) ? '' : index.toString(16).padStart(3, 0)
    let id = `${block}${txI}${index}${hashBit}`
    return id
  } catch (err) {
    console.error(err)
    return err
  }
}

export const getTxOrEventId = ({ blockNumber, transactionIndex, blockHash: hash, logIndex: index }) => {
  return generateId({ blockNumber, transactionIndex, hash, index })
}

export const getInternalTxId = ({ blockNumber, transactionPosition: transactionIndex, transactionHash: hash, _index: index }) => {
  return generateId({ blockNumber, transactionIndex, hash, index })
}

export const getSummaryId = ({ hash, number, timestamp }) => {
  try {
    checkNumbers({ number, timestamp })
    if (!isBlockHash(hash)) throw new Error('blockHash is not a block hash')
    const block = padBlockNumber(number)
    const time = timestamp.toString(16)
    const hashBit = hash.substr(-10, 10)
    const id = `${block}${time}${hashBit}`
    return id
  } catch (err) {
    return err
  }
}

export const getEventId = (event) => getTxOrEventId(event)

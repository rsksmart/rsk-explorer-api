import { isBlockHash } from './utils'

const checkNumbers = payload => {
  for (let name in payload) {
    let number = payload[name]
    if (isNaN(number)) throw new Error(`${name} is not a number`)
  }
}

const padBlockNumber = number => number.toString(16).padStart(7, 0)

export const getTxOrEventId = ({ blockNumber, transactionIndex, blockHash, logIndex }) => {
  try {
    checkNumbers({ blockNumber, transactionIndex })
    if (!isBlockHash(blockHash)) throw new Error('blockHash is not a block hash')

    let block = padBlockNumber(blockNumber)
    let txI = transactionIndex.toString(16).padStart(3, 0)
    let hash = blockHash.substr(-19, 19)
    let id = `${block}${txI}`
    if (undefined !== logIndex) {
      if (logIndex) checkNumbers({ logIndex })
      id += logIndex.toString(16).padStart(3, 0)
    }
    id = `${id}${hash}`
    return id
  } catch (err) {
    return err
  }
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

export const eventId = (event) => {
  let id = getTxOrEventId(event)
  return id
}

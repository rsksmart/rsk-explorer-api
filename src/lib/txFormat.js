import config from './config'
import { isAddress, isBlockHash } from './utils'
export const cfg = config.publicSettings

export const txFormat = (tx) => {
  tx.txType = cfg.txTypes.default
  const receipt = tx.receipt || {}
  if (tx.to === cfg.remascAddress) tx.txType = cfg.txTypes.remasc
  if (tx.to === cfg.bridgeAddress) tx.txType = cfg.txTypes.bridge
  if (isAddress(receipt.contractAddress)) tx.txType = cfg.txTypes.contract
  tx._id = getTxOrEventId(tx)
  return tx
}

const checkNumbers = payload => {
  for (let name in payload) {
    let number = payload[name]
    if (isNaN(number)) throw new Error(`${name} is not a number`)
  }
}

export const getTxOrEventId = ({ blockNumber, transactionIndex, blockHash, logIndex }) => {
  try {
    checkNumbers({ blockNumber, transactionIndex })
    if (!isBlockHash(blockHash)) throw new Error('blockHash is not a block hash')

    let block = blockNumber.toString(16).padStart(7, 0)
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

export const eventId = (event) => {
  let id = getTxOrEventId(event)
  return id
}

export const isDeployment = (tx) => txFormat(tx).txType === cfg.txTypes.contract

export default txFormat

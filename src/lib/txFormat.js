import config from './config'
import { isAddress } from './utils'
import { getTxOrEventId } from './ids'

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

export const isDeployment = (tx) => txFormat(tx).txType === cfg.txTypes.contract

export default txFormat

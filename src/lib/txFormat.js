import config from './config'
import { isAddress } from './utils'
export const cfg = config.publicSettings

export const txFormat = (tx) => {
  tx.txType = cfg.txTypes.default
  const receipt = tx.receipt || {}
  if (tx.to === cfg.remascAddress) tx.txType = cfg.txTypes.remasc
  if (tx.to === cfg.bridgeAddress) tx.txType = cfg.txTypes.bridge
  if (isAddress(receipt.contractAddress)) tx.txType = cfg.txTypes.contract
  return tx
}

export const isDeployment = (tx) => txFormat(tx).txType === cfg.txTypes.contract

export default txFormat

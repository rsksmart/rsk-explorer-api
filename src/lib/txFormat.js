import config from './config'
export const cfg = config.publicSettings

export const txFormat = (tx) => {
  tx.txType = cfg.txTypes.default
  if (tx.to === cfg.remascAddress) tx.txType = cfg.txTypes.remasc
  if (tx.to === cfg.bridgeAddress) tx.txType = cfg.txTypes.bridge
  if ((!tx.to && parseInt(tx.to) !== 0) || tx.to === '0x00') {
    tx.txType = cfg.txTypes.contract
  }
  return tx
}

export default txFormat

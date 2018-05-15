import config from './config'
const cfg = config.publicSettings

export default function (tx) {
  tx.txType = cfg.txTypes.default
  if (tx.to == cfg.remascAddress) tx.txType = cfg.txTypes.remasc
  if (tx.to == cfg.bridgeAddress) tx.txType = cfg.txTypes.bridge
  if (tx.to == cfg.contractDeployAddress) tx.txType = cfg.txTypes.contract
  return tx
}
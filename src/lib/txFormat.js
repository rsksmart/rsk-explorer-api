import config from './config'

export default function (tx) {
  tx.txType = 'normal'
  if (tx.to === config.remascAddress) tx.txType = 'remasc'
  if (tx.to === config.bridgeAddress) tx.txType = 'bridge'
  // if() tx.Type='internal'
  return tx
}
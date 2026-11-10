import getCirculatingSupply from '../api/lib/getCirculatingSupply'
import getActiveAccounts from '../api/lib/getActiveAccounts'
import { Contract, getRskReleaseByBlockNumber, RSK_RELEASES } from '@rsksmart/rsk-contract-parser'
import { serialize } from './utils'
import { nativeContracts } from './NativeContracts'
import nod3 from './nod3Connect'
import { toIntegerString } from '../converters/stats.converters'
const bridgeAddress = nativeContracts.bridge

async function getLockingCap (blockNumber, network) {
  // bridge.getLockingCap() is supported starting from papyrus release
  const isSupportedMethod = blockNumber >= RSK_RELEASES[network].find(r => r.name === 'papyrus').height
  if (!isSupportedMethod) return null

  const { abi: bridgeAbi } = getRskReleaseByBlockNumber(blockNumber, network)

  const bridge = new Contract(bridgeAbi, { address: bridgeAddress, nod3 })

  return bridge.call('getLockingCap', [], { blockNumber })
}

export async function getNetHashrate (node = nod3) {
  const rawHashrate = await node.rpc.sendMethod('eth_netHashrate', [])
  return toIntegerString(rawHashrate)
}

export async function getBlockchainStats ({ bitcoinNetwork, blockHash, blockNumber }) {
  if (!blockHash) throw new Error(`Missing blockhash. blockHash: ${blockHash}`)
  if (!['mainnet', 'testnet'].includes(bitcoinNetwork)) throw new Error(`bitcoinNetwork: ${bitcoinNetwork} is not supported`)

  const circulating = await getCirculatingSupply({ bridge: bridgeAddress })
  const activeAccounts = await getActiveAccounts()
  const hashrate = await getNetHashrate()
  const lockingCap = await getLockingCap(blockNumber, bitcoinNetwork)
  const timestamp = Date.now()

  return {
    circulating,
    activeAccounts,
    hashrate,
    blockHash,
    blockNumber,
    bridge: {
      lockingCap: serialize(lockingCap)
    },
    timestamp
  }
}

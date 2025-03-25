import getCirculatingSupply from '../api/lib/getCirculatingSupply'
import getActiveAccounts from '../api/lib/getActiveAccounts'
import { Contract, getBridgeAbiByBlockNumber } from '@rsksmart/rsk-contract-parser'
import { serialize } from './utils'
import { nativeContracts } from './NativeContracts'
import nod3 from './nod3Connect'

const bridge = nativeContracts.bridge

async function getLockingCap (blockNumber, network) {
  const bridgeAbi = getBridgeAbiByBlockNumber(blockNumber, network)
  const contract = new Contract(bridgeAbi, { address: bridge, nod3 })

  return contract.call('getLockingCap', [])
}

export async function getBlockchainStats ({ bitcoinNetwork, blockHash, blockNumber }) {
  if (!blockHash) throw new Error(`Missing blockhash. blockHash: ${blockHash}`)

  const circulating = await getCirculatingSupply({ bridge })
  const activeAccounts = await getActiveAccounts()
  const hashrate = await nod3.eth.netHashrate()
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

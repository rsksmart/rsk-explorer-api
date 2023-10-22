import getCirculatingSupply from '../api/lib/getCirculatingSupply'
import getActiveAccounts from '../api/lib/getActiveAccounts'
import { Contract, abi as ABI } from '@rsksmart/rsk-contract-parser'
import { serialize } from './utils'
import { nativeContracts } from './NativeContracts'
import nod3 from './nod3Connect'

const bridge = nativeContracts.bridge

async function bridgeCall (bitcoinNetwork, method, params = []) {
  const abi = ABI.bridge({ bitcoinNetwork })
  const contract = Contract(abi, { address: bridge, nod3 })
  const res = await contract.call(method, params)
  return res
}

export async function getBlockchainStats ({ bitcoinNetwork, blockHash, blockNumber }) {
  if (!blockHash) throw new Error(`Missing blockhash. blockHash: ${blockHash}`)

  const circulating = await getCirculatingSupply({ bridge })
  const activeAccounts = await getActiveAccounts()
  const hashrate = await nod3.eth.netHashrate()
  const lockingCap = await bridgeCall(bitcoinNetwork, 'getLockingCap')
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

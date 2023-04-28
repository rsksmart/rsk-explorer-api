import getCirculatingSupply from '../api/lib/getCirculatingSupply'
import getActiveAccounts from '../api/lib/getActiveAccounts'
import { Contract, abi as ABI } from '@rsksmart/rsk-contract-parser'
import { serialize } from './utils'
import initConfig from './initialConfiguration'
import nod3 from './nod3Connect'

async function bridgeCall (method, params = []) {
  try {
    const address = initConfig.nativeContracts.bridge
    const abi = ABI.bridge
    const contract = Contract(abi, { address, nod3 })
    const res = await contract.call(method, params)
    return res
  } catch (error) {
    console.log('Error at bridgeCall():', error)
  }
}

export async function getBlockchainStats ({ blockHash, blockNumber }) {
  try {
    if (!blockHash) throw new Error(`Missing blockchash. blockHash: ${blockHash}`)

    const circulating = await getCirculatingSupply({}, initConfig.nativeContracts)
    const activeAccounts = await getActiveAccounts()
    const hashrate = await nod3.eth.netHashrate()
    const bridge = serialize({ lockingCap: await bridgeCall('getLockingCap') })
    const timestamp = Date.now()

    return {
      circulating,
      activeAccounts,
      hashrate,
      blockHash,
      blockNumber,
      bridge,
      timestamp
    }
  } catch (error) {
    console.log('Error at getBlockchainStats():', error)
  }
}

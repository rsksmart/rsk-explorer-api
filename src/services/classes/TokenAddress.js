import { BcThing } from './BcThing'
import { isAddress, isValidBlockNumber, isBlockHash } from '../../lib/utils'
import { isZeroAddress } from '@rsksmart/rsk-utils'

export class TokenAddress extends BcThing {
  constructor (tokenAddress, { initConfig, contractAddress, blockNumber, blockHash }) {
    if (!isAddress(tokenAddress)) throw new Error(`Invalid tokenAddress: ${tokenAddress}`)
    if (!isValidBlockNumber(blockNumber) || !isBlockHash(blockHash)) throw new Error(`Invalid tokenAddress blockData`)

    super({ initConfig })

    this.isZeroAddress = isZeroAddress(tokenAddress)
    this.address = tokenAddress
    this.data = {
      address: tokenAddress,
      contract: contractAddress,
      balance: null,
      block: {
        number: blockNumber,
        hash: blockHash
      }
    }
  }

  setTokenAddressBalance (balance) {
    this.setData({ balance })
  }
}

export default TokenAddress

import ContractParser from '@rsksmart/rsk-contract-parser'
import { BigNumber } from 'bignumber.js'
import { isAddress } from '@rsksmart/rsk-utils'
import { BcThing } from './BcThing'
import { decodeBlockNftTransfers, nftContractsOf } from '../../lib/nftTransfers'
import { fungibleTokensInterfaces, nftTokensInterfaces } from '../../lib/types'
import { sanitizeContractNameOrSymbol } from '../../lib/utils'

const NAME_MAX_LENGTH = 128
const SYMBOL_MAX_LENGTH = 32
const MAX_UINT8 = 255

const toText = (value, maxLength) => typeof value === 'string'
  ? Array.from(sanitizeContractNameOrSymbol(value)).slice(0, maxLength).join('')
  : null

const toDecimals = value => {
  const decimals = Number(value === null || value === undefined ? NaN : value.toString())
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= MAX_UINT8 ? decimals : null
}

const toUint256 = value => {
  const digits = value === null || value === undefined ? '' : value.toString()
  return /^\d+$/.test(digits) ? new BigNumber(digits).toFixed() : null
}

export function toTokenState (contract, { interfaces, proxyType, implementationAddress }, { name, symbol, decimals, totalSupply }) {
  return {
    contract,
    interfaces: interfaces.join(','),
    isFungible: interfaces.some(i => fungibleTokensInterfaces.includes(i)),
    isNft: interfaces.some(i => nftTokensInterfaces.includes(i)),
    proxyType: proxyType || null,
    implementation: isAddress(implementationAddress) ? implementationAddress.toLowerCase() : null,
    name: toText(name, NAME_MAX_LENGTH),
    symbol: toText(symbol, SYMBOL_MAX_LENGTH),
    decimals: toDecimals(decimals),
    totalSupply: toUint256(totalSupply)
  }
}

export class TokenState extends BcThing {
  async fetch (block, events) {
    const states = []

    for (const contract of nftContractsOf(decodeBlockNftTransfers(events))) {
      states.push(await this.fetchOne(contract, block.number))
    }

    return states
  }

  async fetchOne (contract, blockNumber) {
    const parser = new ContractParser({ nod3: this.nod3, initConfig: this.initConfig, log: this.log, txBlockNumber: blockNumber })
    const details = await parser.getContractDetails(contract, blockNumber)
    const tokenData = await parser.getDefaultTokenData(parser.makeContract(contract), blockNumber)
    return toTokenState(contract, details, tokenData)
  }
}

export default TokenState

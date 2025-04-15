import Logger from '../../lib/Logger'
import axios from 'axios'
import config from '../../lib/config'
import { nod3 } from '../../lib/nod3Connect'
import { ContractParser } from '@rsksmart/rsk-contract-parser'

const log = Logger('[v3.utils]')

const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' ||
    process.argv.some(arg => arg.includes('mocha')) ||
    process.env.npm_lifecycle_event === 'test'
}

export const formatFiatBalance = (balance) => {
  if (typeof balance !== 'number') throw new Error('Balance must be a number')
  if (balance < 0) throw new Error('Balance must be equal or greater than 0')

  return Math.round(balance * 100) / 100
}

export const formatBalance = (hexBalance, decimals = 18) => {
  if (typeof hexBalance !== 'string' || !hexBalance.startsWith('0x')) throw new Error('Balance must be a hex string')
  if (decimals && typeof decimals !== 'number') throw new Error('Decimals must be a number')
  if (decimals && decimals < 0) throw new Error('Decimals must be equal or greater than 0')

  return parseInt(hexBalance, 16) / 10 ** decimals
}

export const getCurrentNetwork = async () => {
  const network = await nod3.net.version()

  if (network.id === '30') return 'mainnet'
  if (network.id === '31') return 'testnet'

  throw new Error('Invalid network response from rsk node')
}

export const getTokenBalanceForAddress = async (address, tokenAddress) => {
  try {
    const parser = new ContractParser({ nod3 })
    const contract = parser.makeContract(tokenAddress)
    const balance = await contract.call('balanceOf', [address]) // Contract parser decoding uses ethers Interface, which in this case returns an ethers.js Bignumber
    const decimals = await contract.call('decimals', [])

    // toHexString() converts an ethers.js Bignumber to a hex string
    const hexBalance = balance.toHexString()
    const formattedBalance = formatBalance(hexBalance, decimals)

    return formattedBalance
  } catch (error) {
    if (!isTestEnvironment()) {
      log.error(`getTokenBalanceForAddress(): error getting token balance for address`)
      log.error(error)
    }
    return Promise.reject(error)
  }
}

export const getAssetsValueInUSDT = async (address, tokens) => {
  try {
    const balances = []

    for (const token of tokens) {
      const balance = await getTokenBalanceForAddress(address, token.address)

      let priceInUSDT

      if (token.isStableCoin) {
        priceInUSDT = 1
      } else if (token.name === 'WETH') {
        // use ETH price
        const ethPriceInUSDT = await getTokenPriceFromBinance('ETH', 'USDT')
        priceInUSDT = ethPriceInUSDT
      } else {
        const tokenPriceInUSDT = await getTokenPriceFromBinance(token.name, 'USDT')
        priceInUSDT = tokenPriceInUSDT
      }

      balances.push({
        name: token.name,
        balance,
        priceInUSDT,
        valueInUSDT: formatFiatBalance(balance * priceInUSDT)
      })
    }

    const totalValueInUSDT = formatFiatBalance(balances.reduce((acc, balance) => acc + balance.valueInUSDT, 0))

    return { balances, totalValueInUSDT }
  } catch (error) {
    if (!isTestEnvironment()) {
      log.error(`getAssetsValueInUSDT(): error getting assets value in USDT`)
      log.error(error)
    }
    return Promise.reject(error)
  }
}

export const getTokenPriceFromBinance = async (token, currency) => {
  try {
    if (typeof token !== 'string' || typeof currency !== 'string') throw new Error('Token and currency must be strings')

    const binanceApiUrl = config.api.stargate.binanceApiUrl
    const tickerUrl = config.api.stargate.tickerUrl
    const response = await axios.get(`${binanceApiUrl}/${tickerUrl}${token}${currency}`)

    if (response.status !== 200) throw new Error('Invalid response status from Binance price endpoint')
    if (!response.data) throw new Error('No response data from Binance price endpoint')
    if (!response.data.lastPrice) throw new Error('No last price data from Binance price endpoint')

    const lastPrice = parseFloat(response.data.lastPrice)
    if (isNaN(lastPrice)) throw new Error('Provided last price is not a number')

    return lastPrice
  } catch (error) {
    if (!isTestEnvironment()) {
      log.error(`getTokenPriceFromBinance(): error getting token price from Binance`)
      log.error(error)
    }
    return Promise.reject(error)
  }
}

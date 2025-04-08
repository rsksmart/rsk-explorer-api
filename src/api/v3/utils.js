import Logger from '../../lib/Logger'
import axios from 'axios'
import config from '../../lib/config'
import { nod3 } from '../../lib/nod3Connect'

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

export const getAddressBalance = async (address) => {
  try {
    const balance = await nod3.eth.getBalance(address)

    return formatBalance(balance)
  } catch (error) {
    if (!isTestEnvironment()) {
      log.error('Error getting address balance')
      log.error(error)
    }
    return Promise.reject(error)
  }
}

export const getRBTCPrice = async () => {
  try {
    const response = await axios.get(config.api.stargate.rbtcPriceFeederUrl)

    if (response.status !== 200) throw new Error('Invalid response status from RBTC price endpoint')
    if (!response.data) throw new Error('No response data from RBTC price endpoint')
    if (!response.data.lastPrice) throw new Error('No last price data from RBTC price endpoint')

    const lastPrice = parseFloat(response.data.lastPrice)
    if (isNaN(lastPrice)) throw new Error('Provided last price is not a number')

    return lastPrice
  } catch (error) {
    if (!isTestEnvironment()) {
      log.error('Error getting RBTC price')
      log.error(error)
    }
    return Promise.reject(error)
  }
}

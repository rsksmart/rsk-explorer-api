import config from '../lib/config'
import { TOTAL_SUPPLY } from '../lib/types'
import { bigNumberDifference, applyDecimals } from '../lib/utils'
const { bridgeAddress } = config

export default async function (collection) {
  try {
    let { balance, decimals } = await collection.findOne({ address: bridgeAddress })
    decimals = decimals || 18
    const bridgeBalance = applyDecimals(balance, decimals).toString(10)
    let circulatingSupply = bigNumberDifference(TOTAL_SUPPLY, bridgeBalance).toString(10)
    return { circulatingSupply, totalSupply: TOTAL_SUPPLY, bridgeBalance }
  } catch (err) {
    return Promise.reject(err)
  }
}

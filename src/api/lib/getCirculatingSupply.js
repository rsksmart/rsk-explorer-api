import { TOTAL_SUPPLY } from '../../lib/types'
import { bigNumberDifference, applyDecimals } from '../../lib/utils'
import { REPOSITORIES } from '../../repositories'

export default async function ({ bridge }) {
  const bridgeAddress = await REPOSITORIES.Address.findOne({ address: bridge })

  if (!bridgeAddress) {
    return {
      circulatingSupply: '0',
      totalSupply: TOTAL_SUPPLY,
      bridgeBalance: '0x0'
    }
  } else {
    try {
      const bridgeBalance = applyDecimals(bridgeAddress.balance, 18).toString(10)
      let circulatingSupply = bigNumberDifference(TOTAL_SUPPLY, bridgeBalance).toString(10)
      return {
        circulatingSupply,
        totalSupply: TOTAL_SUPPLY,
        bridgeBalance
      }
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

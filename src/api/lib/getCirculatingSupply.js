import { TOTAL_SUPPLY } from '../../lib/types'
import { bigNumberDifference, applyDecimals } from '../../lib/utils'
import { addressRepository } from '../../repositories/address.repository'

export default async function (collection, { bridge }) {
  try {
    const result = await addressRepository.findOne({ address: bridge })
    if (!result) throw new Error('Missing bridge account from db')
    const bridgeBalance = applyDecimals(result.balance, 18).toString(10)
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

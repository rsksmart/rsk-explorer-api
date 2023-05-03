import { addrTypes } from '../../lib/types'
import { addressRepository } from '../../repositories/address.repository'

export default async function getActiveAccounts () {
  try {
    const query = {
      AND: [
        { type: addrTypes.ADDRESS },
        { balance: { not: '0x0' } },
        { balance: { not: '0' } }
      ]
    }
    const result = await addressRepository.countDocuments(query)
    return result
  } catch (error) {
    console.log('Error at getActiveAccounts:', error)
  }
}

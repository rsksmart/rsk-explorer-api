import { addrTypes } from '../../lib/types'
import { addressRepository } from '../../repositories/address.repository'

export default async function getActiveAccounts (collections) {
  try {
    let collection = collections.Addrs
    let type = addrTypes.ADDRESS
    let query = { $and: [{ type }, { balance: { $ne: '0x0' } }, { balance: { $ne: '0' } }] }
    let result = await addressRepository.countDocuments(query, collection)
    return result
  } catch (err) {
    return Promise.reject(err)
  }
}

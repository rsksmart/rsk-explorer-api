import { prismaClient } from '../../lib/prismaClient'
import { addrTypes } from '../../lib/types'

export default function getActiveAccounts () {
  return prismaClient.address.count({
    where: {
      type: addrTypes.ADDRESS,
      address_latest_balance_address_latest_balance_addressToaddress: {
        balance: {
          notIn: ['0', '0x0']
        }
      }
    }
  })
}

import { prismaClient } from '../lib/prismaClient'

async function main () {
  const totalAddresses = await prismaClient.address.count()

  console.log(`Total addresses: ${totalAddresses}`)
}

main()

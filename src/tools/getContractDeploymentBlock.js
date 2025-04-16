import { isAddress } from '@rsksmart/rsk-utils'
import nod3 from '../lib/nod3Connect'
import { BcSearch } from '@rsksmart/rsk-contract-parser'

async function main () {
  const bcSearch = BcSearch(nod3)

  const targetAddress = process.argv[2]

  if (!isAddress(targetAddress)) throw new Error('Target must be a valid address')

  console.log(`Target address: ${targetAddress}`)
  console.log('Searching for birth block...')

  try {
    const deploymentBlock = await bcSearch.deploymentBlock(targetAddress)

    if (!deploymentBlock) {
      console.log(`No birth block found for requested address. Result: ${targetAddress}`)
    } else {
      console.log(`Birth block: ${deploymentBlock}`)
    }
  } catch (error) {
    console.log(`Error while searching birth block for address ${targetAddress}`)
    console.log(error)
  }
  process.exit(0)
}

main()

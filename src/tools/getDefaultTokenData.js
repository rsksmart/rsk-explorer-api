import { ContractParser } from '@rsksmart/rsk-contract-parser'
import { nod3Connect } from '../lib/nod3Connect'

async function main () {
  const contractAddress = process.argv[2]
  const network = process.argv[3]
  let blockNumber = process.argv[4]

  let nod3Url = ''
  if (!contractAddress || !network || !blockNumber) {
    console.log('')
    console.info('Usage: node getDefaultTokenData.js <contractAddress: address> <network: testnet|mainnet> <blockNumber: number|blockTag>')
    console.log('')
    console.info('Example with RIF - testnet - Block 6186626:')
    console.info('node dist/tools/getDefaultTokenData.js 0xebea27d994371cd0cb9896ae4c926bc5221f6317 testnet 6186626')
    console.log('')
    process.exit(1)
  }

  if (network !== 'testnet' && network !== 'mainnet') {
    console.error(`Invalid network: ${network}. Must be 'testnet' or 'mainnet'.`)
    process.exit(1)
  }

  if (network === 'testnet') {
    nod3Url = 'https://public-node.testnet.rsk.co'
  } else {
    nod3Url = 'https://public-node.rsk.co'
  }

  const nod3 = nod3Connect(nod3Url)
  const parser = new ContractParser({ nod3 })
  const contract = parser.makeContract(contractAddress)

  // In case its not latest, ensure it's a valid block number
  if (blockNumber !== 'latest') {
    blockNumber = parseInt(blockNumber)
    if (isNaN(blockNumber)) {
      console.error(`Invalid block number: ${blockNumber}. Must be a number or 'latest'.`)
      process.exit(1)
    }
  }

  const tokenData = await parser.getDefaultTokenData(contract, blockNumber)
  console.log(tokenData)
}

main()

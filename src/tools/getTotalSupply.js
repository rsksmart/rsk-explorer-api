import { Contract } from '@rsksmart/rsk-contract-parser'
import { nod3Connect } from '../lib/nod3Connect'

async function main () {
  const abi = [
    {
      constant: true,
      inputs: [],
      name: 'totalSupply',
      outputs: [
        {
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    }
  ]
  const address = process.argv[2]
  const network = process.argv[3]

  if (!address) {
    console.error('Contract address is required')
    process.exit(1)
  }

  if (!['mainnet', 'testnet'].includes(network)) {
    console.error('Network must be either mainnet or testnet')
    process.exit(1)
  }

  const nod3 = nod3Connect(network === 'mainnet'
    ? 'https://public-node.rsk.co'
    : 'https://public-node.testnet.rsk.co')

  const contract = Contract(abi, { address, nod3 })

  const totalSupply = await contract.call('totalSupply')
  console.log(totalSupply)
}

main()

/**
 * Read-only ERC-1155: `eth_call` only (works on public nodes). Pass token ids explicitly.
 *
 * ERC-1155 has no standard "enumerate all ids for an owner" view; auto-discovering ids
 * requires indexing `TransferSingle`/`TransferBatch` (e.g. from logs or a DB) — not done here.
 *
 * Usage:
 *   npx babel-node src/tools/erc1155HolderInfo.js <contract> <holder> <mainnet|testnet> <id1,id2,...>
 *
 * Example:
 *   npx babel-node src/tools/erc1155HolderInfo.js 0xContract 0xHolder mainnet 1,2,42
 */
import { ContractParser } from '@rsksmart/rsk-contract-parser'
import { getAddress } from '@ethersproject/address'
import { nod3Instance } from '../lib/nod3Connect'

function normalizeAddress (addr) {
  return getAddress(String(addr).toLowerCase())
}

const ERC1155_ABI = [
  {
    constant: true,
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' }
    ],
    name: 'balanceOfBatch',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
]

function publicNodeUrl (network) {
  return network === 'testnet'
    ? 'https://public-node.testnet.rsk.co'
    : 'https://public-node.rsk.co'
}

function parseTokenIds (raw) {
  if (!raw || typeof raw !== 'string') return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

async function main () {
  const contractAddress = process.argv[2]
  const holder = process.argv[3]
  const network = process.argv[4]
  const idsArg = process.argv[5]

  if (!contractAddress || !holder || !network || !idsArg) {
    console.error('Usage: npx babel-node src/tools/erc1155HolderInfo.js <contract> <holder> <mainnet|testnet> <id1,id2,...>')
    process.exit(1)
  }
  if (network !== 'mainnet' && network !== 'testnet') {
    console.error(`Invalid network: ${network}. Use mainnet or testnet.`)
    process.exit(1)
  }

  const tokenIds = parseTokenIds(idsArg)
  if (tokenIds.length === 0) {
    console.error('Provide at least one token id (comma-separated).')
    process.exit(1)
  }

  const nod3 = nod3Instance({ url: publicNodeUrl(network) })
  const parser = new ContractParser({ nod3, abi: ERC1155_ABI })
  const contractAddr = normalizeAddress(contractAddress)
  const holderAddr = normalizeAddress(holder)
  const contract = parser.makeContract(contractAddr)

  const accounts = tokenIds.map(() => holderAddr)
  let balances = []
  try {
    balances = await contract.call('balanceOfBatch', [accounts, tokenIds])
  } catch (err) {
    console.error('balanceOfBatch failed:', err.message || err)
    process.exit(1)
  }

  let supports = null
  try {
    supports = await contract.call('supportsInterface', ['0xd9b67a26'])
  } catch (err) { void err /* optional */ }

  const tokens = []
  for (let i = 0; i < tokenIds.length; i++) {
    const idStr = tokenIds[i]
    let uri = null
    try {
      uri = await contract.call('uri', [idStr])
    } catch (err) { void err /* optional */ }
    const b = balances[i]
    tokens.push({
      id: idStr,
      balance: b != null ? String(b) : null,
      uri
    })
  }

  const out = {
    standard: 'ERC-1155',
    network,
    node: publicNodeUrl(network),
    contract: contractAddr,
    holder: holderAddr,
    supportsInterfaceERC1155: supports,
    tokens
  }

  console.log(JSON.stringify(out, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

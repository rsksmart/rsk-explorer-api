import { defaultAbiCoder } from '@ethersproject/abi'
import { getEventId } from '../../../src/lib/ids'
import { TRANSFER_TOPIC, TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC, ZERO_ADDRESS } from '../../../src/lib/nftTransfers'

export const ZERO = ZERO_ADDRESS
export const SENDER = '0x5e0000000000000000000000000000000000005e'
const MINER = '0x3300000000000000000000000000000000000033'
const OPERATOR = '0x0e0000000000000000000000000000000000000e'

const word = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
const addressTopic = address => word(address.slice(2))

export const erc721 = (contract, from, to, tokenId) => ({ kind: 'nft', contract, topics: [TRANSFER_TOPIC, addressTopic(from), addressTopic(to), word(BigInt(tokenId).toString(16))], data: '0x', args: [from, to, String(tokenId)] })
export const erc20 = (contract, from, to, value) => ({ kind: 'fungible', contract, from, to, topics: [TRANSFER_TOPIC, addressTopic(from), addressTopic(to)], data: word(BigInt(value).toString(16)), args: [from, to, String(value)] })
export const erc1155Single = (contract, from, to, id, value) => ({ kind: 'nft', contract, topics: [TRANSFER_SINGLE_TOPIC, addressTopic(OPERATOR), addressTopic(from), addressTopic(to)], data: defaultAbiCoder.encode(['uint256', 'uint256'], [id, value]), args: [OPERATOR, from, to, String(id), String(value)] })
export const erc1155Batch = (contract, from, to, ids, values) => ({ kind: 'nft', contract, topics: [TRANSFER_BATCH_TOPIC, addressTopic(OPERATOR), addressTopic(from), addressTopic(to)], data: defaultAbiCoder.encode(['uint256[]', 'uint256[]'], [ids, values]), args: [OPERATOR, from, to, ids.map(String), values.map(String)] })

export const tokenStateAt = (contract, number) => ({
  contract,
  interfaces: 'ERC165,ERC721',
  isFungible: false,
  isNft: true,
  proxyType: number % 3 === 0 ? 'ERC1967' : null,
  implementation: number % 3 === 0 ? `0x${(number % 7).toString(16).padStart(40, '0')}` : null,
  name: `name-${contract.slice(-4)}-v${Math.floor(number / 70)}`,
  symbol: `S${number % 5}`,
  decimals: 0,
  totalSupply: String(number)
})

export const blockHashOf = (number, tag) => word(`${number.toString(16)}${tag}`.padStart(8, '0') + 'b')

export function blockData (number, tag, logs, { firstLogIndex = 0 } = {}) {
  const hash = blockHashOf(number, tag)
  const txHash = word(`${number.toString(16)}${tag}7`)
  const timestamp = 1700000000 + number
  const block = {
    number, hash, parentHash: word('0'), sha3Uncles: word('0'), logsBloom: '0x', transactionsRoot: word('0'), stateRoot: word('0'),
    receiptsRoot: word('0'), miner: MINER, difficulty: '0x1', totalDifficulty: '0x1', extraData: '0x', size: 1, gasLimit: 6800000, gasUsed: 21000,
    timestamp, transactions: [txHash], uncles: [], minimumGasPrice: '0x0', bitcoinMergedMiningHeader: '0x', bitcoinMergedMiningCoinbaseTransaction: '0x',
    bitcoinMergedMiningMerkleProof: '0x', hashForMergedMining: word('0'), paidFees: '0x0', cumulativeDifficulty: '0x1', _received: timestamp
  }
  const receipt = {
    transactionHash: txHash, contractAddress: null, logsBloom: '0x', cumulativeGasUsed: 21000, effectiveGasPrice: '0x0', blockHash: hash, logs: [],
    blockNumber: number, gasUsed: 21000, to: SENDER, from: SENDER, type: '0x0', status: '0x1', transactionIndex: 0
  }
  const tx = {
    hash: txHash, nonce: number, blockHash: hash, blockNumber: number, transactionIndex: 0, from: SENDER, to: SENDER, gas: 21000, gasPrice: '0x0',
    value: '0x0', input: '0x', type: '0x0', timestamp, status: '0x1', isSuccessful: true, receipt, txType: 'normal',
    txId: getEventId({ blockNumber: number, transactionIndex: 0, blockHash: hash }), gasUsed: 21000
  }
  const events = logs.map((log, i) => ({ log, logIndex: firstLogIndex + i })).map(({ log, logIndex }) => ({
    eventId: getEventId({ blockNumber: number, transactionIndex: 0, blockHash: hash, logIndex }),
    address: log.contract, topics: log.topics, data: log.data, args: log.args, abi: null, event: null, signature: null,
    blockHash: hash, blockNumber: number, logIndex, transactionHash: txHash, transactionIndex: 0, timestamp, txStatus: '0x1', _addresses: []
  }))
  const names = new Set([SENDER, ...logs.map(l => l.contract), ...logs.flatMap(l => l.topics.slice(1).map(t => `0x${t.slice(-40)}`))])
  const addresses = [...names].map(address => ({ address, isNative: false, type: 'account', name: null, balance: '0x0', blockNumber: number }))
  const nftContracts = [...new Set(logs.filter(l => l.kind === 'nft').map(l => l.contract))].sort()
  const tokenAddresses = [...new Map(logs.filter(l => l.kind === 'fungible')
    .flatMap(l => [l.from, l.to].map(address => [`${l.contract}|${address}`, { address, contract: l.contract, balance: '0x1', block: { number, hash } }]))).values()]

  return {
    block,
    transactions: [tx],
    internalTransactions: [],
    events,
    tokenAddresses,
    tokenStates: nftContracts.map(contract => tokenStateAt(contract, number)),
    addresses,
    suicides: [],
    balances: [],
    latestBalances: { blockNumber: number, balances: addresses.map(({ address }) => ({ address, balance: '0x0', blockNumber: number })) }
  }
}

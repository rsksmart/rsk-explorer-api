import { defaultAbiCoder } from '@ethersproject/abi'
import { getEventId } from '../../../src/lib/ids'
import { TRANSFER_TOPIC, TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC, ZERO_ADDRESS } from '../../../src/lib/nftTransfers'

export const ZERO = ZERO_ADDRESS
export const SENDER = '0x5e0000000000000000000000000000000000005e'
const MINER = '0x3300000000000000000000000000000000000033'
const OPERATOR = '0x0e0000000000000000000000000000000000000e'

const padTo32Bytes = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
const addressTopic = address => padTo32Bytes(address.slice(2))
const ZERO_HASH = padTo32Bytes('0')

export const erc721 = (contract, from, to, tokenId) => ({ kind: 'nft', contract, topics: [TRANSFER_TOPIC, addressTopic(from), addressTopic(to), padTo32Bytes(BigInt(tokenId).toString(16))], data: '0x', args: [from, to, String(tokenId)] })
export const erc20 = (contract, from, to, amount) => ({ kind: 'fungible', contract, from, to, topics: [TRANSFER_TOPIC, addressTopic(from), addressTopic(to)], data: padTo32Bytes(BigInt(amount).toString(16)), args: [from, to, String(amount)] })
export const erc1155Single = (contract, from, to, tokenId, quantity) => ({ kind: 'nft', contract, topics: [TRANSFER_SINGLE_TOPIC, addressTopic(OPERATOR), addressTopic(from), addressTopic(to)], data: defaultAbiCoder.encode(['uint256', 'uint256'], [tokenId, quantity]), args: [OPERATOR, from, to, String(tokenId), String(quantity)] })
export const erc1155Batch = (contract, from, to, tokenIds, quantities) => ({ kind: 'nft', contract, topics: [TRANSFER_BATCH_TOPIC, addressTopic(OPERATOR), addressTopic(from), addressTopic(to)], data: defaultAbiCoder.encode(['uint256[]', 'uint256[]'], [tokenIds, quantities]), args: [OPERATOR, from, to, tokenIds.map(String), quantities.map(String)] })

export const tokenStateAt = (contract, number) => ({
  contract,
  interfaces: ['ERC165', 'ERC721'],
  isFungible: false,
  isNft: true,
  proxyType: number % 3 === 0 ? 'ERC1967' : null,
  implementation: number % 3 === 0 ? `0x${(number % 7).toString(16).padStart(40, '0')}` : null,
  name: `name-${contract.slice(-4)}-v${Math.floor(number / 70)}`,
  symbol: `S${number % 5}`,
  decimals: 0,
  totalSupply: String(number)
})

export const blockHashOf = (number, tag) => padTo32Bytes(`${number.toString(16)}${tag}`.padStart(8, '0') + 'b')

export function blockData (number, tag, logs, { firstLogIndex = 0 } = {}) {
  const hash = blockHashOf(number, tag)
  const txHash = padTo32Bytes(`${number.toString(16)}${tag}7`)
  const timestamp = 1700000000 + number
  const block = {
    number, hash, parentHash: ZERO_HASH, sha3Uncles: ZERO_HASH, logsBloom: '0x', transactionsRoot: ZERO_HASH, stateRoot: ZERO_HASH,
    receiptsRoot: ZERO_HASH, miner: MINER, difficulty: '0x1', totalDifficulty: '0x1', extraData: '0x', size: 1, gasLimit: 6800000, gasUsed: 21000,
    timestamp, transactions: [txHash], uncles: [], minimumGasPrice: '0x0', bitcoinMergedMiningHeader: '0x', bitcoinMergedMiningCoinbaseTransaction: '0x',
    bitcoinMergedMiningMerkleProof: '0x', hashForMergedMining: ZERO_HASH, paidFees: '0x0', cumulativeDifficulty: '0x1', _received: timestamp
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
  const events = logs.map((log, i) => {
    const logIndex = firstLogIndex + i
    return {
      eventId: getEventId({ blockNumber: number, transactionIndex: 0, blockHash: hash, logIndex }),
      address: log.contract, topics: log.topics, data: log.data, args: log.args, abi: null, event: null, signature: null,
      blockHash: hash, blockNumber: number, logIndex, transactionHash: txHash, transactionIndex: 0, timestamp, txStatus: '0x1', _addresses: []
    }
  })
  const allAddresses = new Set([SENDER, ...logs.map(log => log.contract), ...logs.flatMap(log => log.topics.slice(1).map(topic => `0x${topic.slice(-40)}`))])
  const addresses = [...allAddresses].map(address => ({ address, isNative: false, type: 'account', name: null, balance: '0x0', blockNumber: number }))
  const nftContracts = [...new Set(logs.filter(log => log.kind === 'nft').map(log => log.contract))].sort()
  const fungibleBalances = new Map()
  for (const log of logs) {
    if (log.kind !== 'fungible') continue
    for (const address of [log.from, log.to]) {
      fungibleBalances.set(`${log.contract}|${address}`, { address, contract: log.contract, balance: '0x1', block: { number, hash } })
    }
  }
  const tokenAddresses = [...fungibleBalances.values()]

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

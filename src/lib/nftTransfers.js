import { defaultAbiCoder } from '@ethersproject/abi'
import { BigNumber } from 'bignumber.js'
import { soliditySignature } from '@rsksmart/rsk-contract-parser/dist/lib/utils'
import { contractsInterfaces } from './types'

export const TRANSFER_TOPIC = '0x' + soliditySignature('Transfer(address,address,uint256)')
export const TRANSFER_SINGLE_TOPIC = '0x' + soliditySignature('TransferSingle(address,address,address,uint256,uint256)')
export const TRANSFER_BATCH_TOPIC = '0x' + soliditySignature('TransferBatch(address,address,address,uint256[],uint256[])')
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const NFT_STANDARDS = [contractsInterfaces.ERC721, contractsInterfaces.ERC1155]

const topicToAddress = topic => `0x${topic.slice(-40)}`.toLowerCase()
const toTokenId = value => `0x${new BigNumber(value.toString()).toString(16).padStart(64, '0')}`

function decodeErc1155Amounts (topic0, data) {
  try {
    if (topic0 === TRANSFER_SINGLE_TOPIC) return defaultAbiCoder.decode(['uint256', 'uint256'], data).map(value => [value])
    return defaultAbiCoder.decode(['uint256[]', 'uint256[]'], data)
  } catch (error) {
    return [[], []]
  }
}

export function decodeNftTransfers ({ eventId, address, blockNumber, blockHash, transactionHash, timestamp, topics = [], data }) {
  const [topic0] = topics
  if (topics.length !== 4) return []
  const fact = { eventId, blockNumber, blockHash, transactionHash, timestamp, contract: address.toLowerCase() }

  if (topic0 === TRANSFER_TOPIC) {
    return [{ ...fact, standard: contractsInterfaces.ERC721, from: topicToAddress(topics[1]), to: topicToAddress(topics[2]), tokenId: topics[3].toLowerCase(), value: '1' }]
  }
  if (topic0 !== TRANSFER_SINGLE_TOPIC && topic0 !== TRANSFER_BATCH_TOPIC) return []

  const [ids, values] = decodeErc1155Amounts(topic0, data)
  const valueById = new Map()
  ids.slice(0, values.length).forEach((id, i) => {
    const tokenId = toTokenId(id)
    valueById.set(tokenId, (valueById.get(tokenId) || new BigNumber(0)).plus(values[i].toString()))
  })

  const from = topicToAddress(topics[2])
  const to = topicToAddress(topics[3])
  return [...valueById].map(([tokenId, value]) => ({ ...fact, standard: contractsInterfaces.ERC1155, from, to, tokenId, value: value.toFixed() }))
}

export const decodeBlockNftTransfers = events => events.filter(Boolean).flatMap(decodeNftTransfers)

export const nftContractsOf = facts => [...new Set(facts.map(fact => fact.contract))].sort()

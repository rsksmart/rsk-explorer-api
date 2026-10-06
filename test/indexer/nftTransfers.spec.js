import { expect } from 'chai'
import { defaultAbiCoder } from '@ethersproject/abi'
import { decodeNftTransfers, TRANSFER_TOPIC, TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC } from '../../src/lib/nftTransfers'

const contract = '0xB50069B248D0B9C268032EF16F1A6E019EB9807F'
const from = '0x1111111111111111111111111111111111111111'
const to = '0x2222222222222222222222222222222222222222'
const word = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
const log = (topics, data = '0x') => ({ eventId: '0597d6700000064cbabababababababab', address: contract, blockNumber: 5928199, blockHash: word('ab'), transactionHash: word('cd'), timestamp: 1640000000, topics, data })

describe('decodeNftTransfers', () => {
  it('reads an ERC-721 token id from topic3 and lowercases every address', () => {
    const [fact] = decodeNftTransfers(log([TRANSFER_TOPIC, word(from), word(to), word('0A')]))

    expect(fact).to.include({ standard: 'ERC721', contract: contract.toLowerCase(), from, to, tokenId: word('0a'), value: '1' })
  })

  it('ignores a 3-topic ERC-20 Transfer', () => {
    expect(decodeNftTransfers(log([TRANSFER_TOPIC, word(from), word(to)], word('05')))).to.deep.equal([])
  })

  it('decodes a TransferSingle id and value from data, with from and to in topics 2 and 3', () => {
    const data = defaultAbiCoder.encode(['uint256', 'uint256'], [7, 3])
    const facts = decodeNftTransfers(log([TRANSFER_SINGLE_TOPIC, word(from), word(from), word(to)], data))

    expect(facts).to.have.lengthOf(1)
    expect(facts[0]).to.include({ standard: 'ERC1155', from, to, tokenId: word('07'), value: '3' })
  })

  it('merges an id repeated inside one TransferBatch into one fact, since the key is (eventId, tokenId)', () => {
    const data = defaultAbiCoder.encode(['uint256[]', 'uint256[]'], [[7, 8, 7], [2, 1, 3]])
    const facts = decodeNftTransfers(log([TRANSFER_BATCH_TOPIC, word(from), word(from), word(to)], data))

    expect(facts.map(f => [f.tokenId, f.value])).to.deep.equal([[word('07'), '5'], [word('08'), '1']])
  })

  it('keeps values beyond 2^53 exact', () => {
    const max = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
    const data = defaultAbiCoder.encode(['uint256[]', 'uint256[]'], [[max], [max]])
    const [fact] = decodeNftTransfers(log([TRANSFER_BATCH_TOPIC, word(from), word(from), word(to)], data))

    expect(fact.tokenId).to.equal(`0x${'f'.repeat(64)}`)
    expect(fact.value).to.equal(max)
  })

  it('returns no fact for undecodable ERC-1155 data or a log with the wrong topic count', () => {
    expect(decodeNftTransfers(log([TRANSFER_SINGLE_TOPIC, word(from), word(from), word(to)], '0x1234')).length).to.equal(0)
    expect(decodeNftTransfers(log([TRANSFER_SINGLE_TOPIC, word(from), word(to)], defaultAbiCoder.encode(['uint256', 'uint256'], [1, 1]))).length).to.equal(0)
  })
})

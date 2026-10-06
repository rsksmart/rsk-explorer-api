import { expect } from 'chai'
import { rawEventToEntity } from '../../src/converters/event.converters'

const checksummedAddress = '0x11b64191106b1Cf66FCd2F8389077c596cDc5646'
const alternateCasing = '0x11B64191106B1CF66FCD2F8389077C596CDC5646'
const lowercaseAddress = checksummedAddress.toLowerCase()

const makeRawEvent = address => ({
  eventId: `${address}-0`,
  abi: null,
  address,
  args: [],
  topics: ['0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'],
  blockHash: '0xblock',
  blockNumber: 1,
  data: '0x',
  event: 'TransferSingle',
  logIndex: 0,
  signature: 'sig',
  timestamp: 1,
  transactionHash: '0xtx',
  transactionIndex: 0,
  txStatus: '0x1'
})

describe('event.converters', () => {
  describe('rawEventToEntity', () => {
    it('lowercases the emitter address so mixed-case spellings of one contract collapse to a single groupBy row', () => {
      const fromChecksummed = rawEventToEntity(makeRawEvent(checksummedAddress))
      const fromAlternateCasing = rawEventToEntity(makeRawEvent(alternateCasing))

      expect(fromChecksummed.address).to.equal(lowercaseAddress)
      expect(fromAlternateCasing.address).to.equal(lowercaseAddress)
      expect(new Set([fromChecksummed.address, fromAlternateCasing.address]).size).to.equal(1)
    })
  })
})

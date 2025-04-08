import { expect } from 'chai'
import sinon from 'sinon'
import axios from 'axios'
import * as utils from '../../../src/api/v3/utils'
import * as nod3 from '../../../src/lib/nod3Connect'

const testBalances = [
  {
    hexBalance: '0xda475abf000',
    decimalBalance: 0.000015
  },
  {
    hexBalance: '0x18af46ab16b5ab0',
    decimalBalance: 0.11116987990431199
  },
  {
    hexBalance: '0x0',
    decimalBalance: 0
  }
]

describe('v3 API Utils', () => {
  describe('formatFiatBalance', () => {
    it('should round a decimal number to two decimal places', () => {
      expect(utils.formatFiatBalance(123.456)).to.equal(123.46)
      expect(utils.formatFiatBalance(0.001)).to.equal(0)
      expect(utils.formatFiatBalance(100.5)).to.equal(100.5)
    })

    it('should accept integer values', () => {
      expect(utils.formatFiatBalance(100)).to.equal(100)
      expect(utils.formatFiatBalance(0)).to.equal(0)
    })

    it('should throw an error if balance is not a number', () => {
      expect(() => utils.formatFiatBalance('100')).to.throw('Balance must be a number')
      expect(() => utils.formatFiatBalance(null)).to.throw('Balance must be a number')
      expect(() => utils.formatFiatBalance(undefined)).to.throw('Balance must be a number')
    })

    it('should throw an error if balance is negative', () => {
      expect(() => utils.formatFiatBalance(-1)).to.throw('Balance must be equal or greater than 0')
    })
  })

  describe('formatBalance', () => {
    it('should format a hex balance string to its proper decimal representation', () => {
      for (const { hexBalance, decimalBalance } of testBalances) {
        expect(utils.formatBalance(hexBalance)).to.equal(decimalBalance)
      }
    })

    it('should throw an error if balance is not a string', () => {
      expect(() => utils.formatBalance(100)).to.throw('Balance must be a hex string')
    })

    it('should throw an error if balance is not a hex string', () => {
      expect(() => utils.formatBalance('100')).to.throw('Balance must be a hex string')
    })

    it('should throw an error if decimals is not a number', () => {
      expect(() => utils.formatBalance('0x1', 'not-a-number')).to.throw('Decimals must be a number')
    })

    it('should throw an error if decimals is negative', () => {
      expect(() => utils.formatBalance('0x1', -1)).to.throw('Decimals must be equal or greater than 0')
    })
  })

  describe('getAddressBalance', () => {
    let nod3Mock

    beforeEach(() => {
      // Create a mock nod3 object
      nod3Mock = {
        eth: {
          getBalance: sinon.stub()
        }
      }

      // Replace the nod3 import with our mock
      sinon.stub(nod3, 'nod3').value(nod3Mock)
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should return the formatted balance for a valid address', async () => {
      for (const { hexBalance, decimalBalance } of testBalances) {
        nod3Mock.eth.getBalance.resolves(hexBalance)
        const formattedBalance = await utils.getAddressBalance('0x123')
        expect(formattedBalance).to.equal(decimalBalance)
      }
    })

    it('should reject if the nod3 call fails', async () => {
      const error = new Error('Connection error')
      nod3Mock.eth.getBalance.rejects(error)

      try {
        await utils.getAddressBalance('0x123456789abcdef')
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err).to.equal(error)
      }
    })

    it('should reject if the balance is not a valid hex string', async () => {
      nod3Mock.eth.getBalance.resolves('invalid-balance')

      try {
        await utils.getAddressBalance('0x123456789abcdef')
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err.message).to.equal('Balance must be a hex string')
      }
    })
  })

  describe('getRBTCPrice', () => {
    // Declare stub variable
    let axiosGetStub

    afterEach(() => {
      // Restore stubs if they exist
      if (axiosGetStub && axiosGetStub.restore) {
        axiosGetStub.restore()
      }
    })

    it('should get the RBTC price from the external API', async () => {
      // Stub axios.get to return a fake price response
      const mockResponse = {
        status: 200,
        data: {
          lastPrice: '25000.50'
        }
      }
      axiosGetStub = sinon.stub(axios, 'get').resolves(mockResponse)

      const price = await utils.getRBTCPrice()
      expect(price).to.equal(25000.5)
    })

    it('should reject if the response status is not 200', async () => {
      // Stub axios.get to return a non-200 status
      axiosGetStub = sinon.stub(axios, 'get').resolves({
        status: 404,
        data: null
      })

      try {
        await utils.getRBTCPrice()
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err.message).to.equal('Invalid response status from RBTC price endpoint')
      }
    })

    it('should reject if response data is missing', async () => {
      // Stub axios.get to return a response with no data
      axiosGetStub = sinon.stub(axios, 'get').resolves({
        status: 200,
        data: null
      })

      try {
        await utils.getRBTCPrice()
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err.message).to.equal('No response data from RBTC price endpoint')
      }
    })

    it('should reject if lastPrice property is missing', async () => {
      // Stub axios.get to return a response with no lastPrice
      axiosGetStub = sinon.stub(axios, 'get').resolves({
        status: 200,
        data: {}
      })

      try {
        await utils.getRBTCPrice()
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err.message).to.equal('No last price data from RBTC price endpoint')
      }
    })

    it('should reject if lastPrice property is not a valid number', async () => {
      // Stub axios.get to return a response with an invalid lastPrice
      axiosGetStub = sinon.stub(axios, 'get').resolves({
        status: 200,
        data: {
          lastPrice: 'not-a-number'
        }
      })

      try {
        await utils.getRBTCPrice()
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err.message).to.equal('Provided last price is not a number')
      }
    })

    it('should reject if the axios request fails', async () => {
      // Stub axios.get to reject with an error
      const error = new Error('Network error')
      axiosGetStub = sinon.stub(axios, 'get').rejects(error)

      try {
        await utils.getRBTCPrice()
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err).to.equal(error)
      }
    })
  })
})

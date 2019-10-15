import { expect } from 'chai'
import * as btcUtils from '../src/lib/btcUtils'

describe(`# btcUtils`, function () {
  describe(`sha256()`, function () {
    it(`should return a sha-256 hash`, () => {
      const [value, expected] =
        ['0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352',
          '0b7c28c9b7290c98d7438e70b3d3f7c848fbd7d1dc194ff83f4f7cc9b1378e98']
      expect(btcUtils.sha256(value)).to.be.equal(expected)
      expect(btcUtils.sha256(`0x${value}`)).to.be.equal(expected)
    })
  })

  describe(`h160()`, function () {
    it(`should return a h160 hash`, () => {
      const [value, expected] =
        ['0b7c28c9b7290c98d7438e70b3d3f7c848fbd7d1dc194ff83f4f7cc9b1378e98',
          'f54a5851e9372b87810a8e60cdd2e7cfd80b6e31']
      expect(btcUtils.h160(value)).to.be.equal(expected)
      expect(btcUtils.h160(`0x${value}`)).to.be.equal(expected)
    })
  })

  describe(`h160toAddress()`, function () {
    it(`should return an address from an h160 hash`, () => {
      const [value, expected, net] = [
        'f54a5851e9372b87810a8e60cdd2e7cfd80b6e31',
        '1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs',
        'mainnet'
      ]
      expect(btcUtils.h160toAddress(value, net)).to.be.equal(expected)
      expect(btcUtils.h160toAddress(`0x${value}`, net)).to.be.equal(expected)
    })
  })

  describe(`pubToAddress()`, function () {
    it(`should return an address from hex public key`, () => {
      const [pub, net, address] = [
        '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352',
        'mainnet',
        '1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs'
      ]
      expect(btcUtils.pubToAddress(pub, net)).to.be.equal(address)
      expect(btcUtils.pubToAddress(`0x${pub}`, net)).to.be.equal(address)
    })
  })

  describe(`decompressPublic()`, function () {
    it(`should return an uncompressed public key`, () => {
      const [c, u] = [
        '02c6018fcbd3e89f3cf9c7f48b3232ea3638eb8bf217e59ee290f5f0cfb2fb9259',
        '04c6018fcbd3e89f3cf9c7f48b3232ea3638eb8bf217e59ee290f5f0cfb2fb9259fd2c5fd43652022645cbfa62bf24c759102dca0746b25d69fffed1b2162dbfd4'
      ]
      expect(btcUtils.decompressPublic(c)).to.be.equal(u)
    })
  })

  describe(`compressPublic()`, function () {
    it(`should return a compressed public key`, () => {
      const [c, u] = [
        '04c6018fcbd3e89f3cf9c7f48b3232ea3638eb8bf217e59ee290f5f0cfb2fb9259fd2c5fd43652022645cbfa62bf24c759102dca0746b25d69fffed1b2162dbfd4',
        '02c6018fcbd3e89f3cf9c7f48b3232ea3638eb8bf217e59ee290f5f0cfb2fb9259'
      ]
      expect(btcUtils.compressPublic(c)).to.be.equal(u)
    })
  })

  describe(`rskAddressFromBtcPublicKey()`, function () {
    it(`should return a valid rsk address from uncompressed btc public key`, () => {
      const [pub, address] = ['041aabbeb9b27258f98c2bf21f36677ae7bae09eb2d8c958ef41a20a6e88626d261f17f8ec02af309b7b50c06e2baa05a57166266e038a0a7dce7b70386e8260a3',
        '0x32c865f2dbf36ce6f4cfcb624b559ef98b33a2d1']
      expect(btcUtils.rskAddressFromBtcPublicKey(pub)).to.be.equal(address)
      expect(btcUtils.rskAddressFromBtcPublicKey(`0x${pub}`)).to.be.equal(address)
    })
    it(`should return a valid rsk address from compressed btc public key`, () => {
      const [pub, address] = ['031aabbeb9b27258f98c2bf21f36677ae7bae09eb2d8c958ef41a20a6e88626d26',
        '0x32c865f2dbf36ce6f4cfcb624b559ef98b33a2d1']
      expect(btcUtils.rskAddressFromBtcPublicKey(pub)).to.be.equal(address)
      expect(btcUtils.rskAddressFromBtcPublicKey(`0x${pub}`)).to.be.equal(address)
    })
  })
})

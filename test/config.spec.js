import { expect } from 'chai'
import { makeConfig, nodeSources, createNodeSource } from '../src/lib/config'

describe('# Config', function () {
  it('should get the default config', () => {
    let config = makeConfig()
    expect(config).to.be.an('object')
    expect(Object.keys(config)).include.members(['blocks', 'api', 'source'])
  })

  describe(`sources`, function () {
    let protocol = 'htttps'
    let node = 'test.com'
    let port = '555'
    let url = `${protocol}://${node}:${port}`
    let source = createNodeSource({ url })
    it(`should return a source object`, () => {
      expect(source.url).to.be.equal(url)
      expect(source.protocol).to.be.equal(protocol)
      expect(source.node).to.be.equal(node)
      expect(source.port).to.be.equal(port)
      expect(createNodeSource(Object.assign(Object.assign({}, source), { url: null }))).to.be.deep.equal(source)
    })
    it(`should return an object`, () => {
      expect(nodeSources(source)).to.be.an('object')
      expect(nodeSources([source, source])).to.be.an('object')
    })
    it('should return an array of source objects', () => {
      expect(nodeSources([source, { url: 'https://x.com' }])).to.be.an('array')
    })
  })

  describe('bitcoin.rpcUrl', function () {
    const ENV_URL = 'https://bitcoin-mainnet.example.com/v2/from-the-environment'
    const SECOND_URL = 'https://bitcoin-mainnet.example.com/v2/second-endpoint'
    const FILE_URL = 'https://bitcoin-mainnet.example.com/v2/from-config-json'
    const originalEnv = process.env.BITCOIN_RPC_URL

    afterEach(function () {
      if (originalEnv === undefined) delete process.env.BITCOIN_RPC_URL
      else process.env.BITCOIN_RPC_URL = originalEnv
    })

    it('takes the endpoint from the environment', function () {
      process.env.BITCOIN_RPC_URL = ENV_URL

      expect(makeConfig({}).bitcoin.rpcUrl).to.deep.equal([ENV_URL])
    })

    it('reads a comma-separated environment list as ordered endpoints', function () {
      process.env.BITCOIN_RPC_URL = ` ${ENV_URL} , ${SECOND_URL} `

      expect(makeConfig({}).bitcoin.rpcUrl).to.deep.equal([ENV_URL, SECOND_URL])
    })

    it('ignores any rpcUrl in config.json: the environment is the only source', function () {
      process.env.BITCOIN_RPC_URL = ENV_URL

      expect(makeConfig({ bitcoin: { rpcUrl: FILE_URL } }).bitcoin.rpcUrl).to.deep.equal([ENV_URL])
    })

    it('yields no endpoints when the environment names none, with no default', function () {
      delete process.env.BITCOIN_RPC_URL

      expect(makeConfig({ bitcoin: { rpcUrl: FILE_URL } }).bitcoin.rpcUrl).to.deep.equal([])
      expect(makeConfig({}).bitcoin.rpcUrl).to.deep.equal([])
    })
  })
})

import { expect } from 'chai'
import { createConfig, makeConfig, nodeSources, createNodeSource } from '../src/lib/config'

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
    it(`carries the url, building it from parts when url is absent`, () => {
      expect(source).to.deep.equal({ url })
      expect(createNodeSource({ protocol, node, port, url: null })).to.deep.equal({ url })
    })
    it(`should return an object`, () => {
      expect(nodeSources(source)).to.be.an('object')
      expect(nodeSources([source, source])).to.be.an('object')
    })
    it('should return an array of source objects', () => {
      expect(nodeSources([source, { url: 'https://x.com' }])).to.be.an('array')
    })
  })

  describe('RSK_NODE_URL', function () {
    const originalEnv = process.env.RSK_NODE_URL

    afterEach(() => {
      if (originalEnv === undefined) delete process.env.RSK_NODE_URL
      else process.env.RSK_NODE_URL = originalEnv
    })

    it('is the node source, applied by createConfig that every process loads its config through', () => {
      process.env.RSK_NODE_URL = 'http://env-node.test:4450'

      expect(createConfig().source.url).to.equal('http://env-node.test:4450')
    })

    it('becomes the source, also under blocks.source', () => {
      process.env.RSK_NODE_URL = 'https://env-node.test:4450/key'

      const config = makeConfig({ api: { port: 3003 } })

      expect(config.source).to.deep.equal({ url: 'https://env-node.test:4450/key' })
      expect(config.blocks.source).to.equal(config.source)
    })

    it('falls back to the built-in default source when unset', () => {
      delete process.env.RSK_NODE_URL

      expect(makeConfig().source.url).to.equal('http://localhost:4444')
    })

    it('accepts a comma-separated list as multiple sources, in order and de-duplicated', () => {
      process.env.RSK_NODE_URL = 'http://a.test:4444, http://b.test:4444, http://a.test:4444'

      expect(makeConfig().source).to.deep.equal([
        { url: 'http://a.test:4444' },
        { url: 'http://b.test:4444' }
      ])
    })

    it('refuses a value that is not an http or https URL, naming the variable and not its value', () => {
      const refusal = value => {
        process.env.RSK_NODE_URL = value
        try {
          makeConfig()
          return null
        } catch (error) {
          return error.message
        }
      }

      expect(['not a url', 'ftp://env-node.test', 'secret-key-123:pass@env-node.test'].map(refusal)).to.deep.equal([
        'RSK_NODE_URL must be a valid URL',
        'RSK_NODE_URL must be an http or https URL',
        'RSK_NODE_URL must be an http or https URL'
      ])
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

  describe('bitcoin.enabled', function () {
    const originalEnv = process.env.BITCOIN_STATS_ENABLED

    afterEach(function () {
      if (originalEnv === undefined) delete process.env.BITCOIN_STATS_ENABLED
      else process.env.BITCOIN_STATS_ENABLED = originalEnv
    })

    it('is disabled by default when the flag is unset', function () {
      delete process.env.BITCOIN_STATS_ENABLED

      expect(makeConfig({}).bitcoin.enabled).to.equal(false)
    })

    it('is enabled only for an explicit opt-in value', function () {
      for (const value of ['true', 'TRUE', '1', 'yes', 'on', ' true ']) {
        process.env.BITCOIN_STATS_ENABLED = value
        expect(makeConfig({}).bitcoin.enabled, value).to.equal(true)
      }
    })

    it('stays disabled for any other value', function () {
      for (const value of ['false', '0', 'no', 'off', '', 'enabled']) {
        process.env.BITCOIN_STATS_ENABLED = value
        expect(makeConfig({}).bitcoin.enabled, value).to.equal(false)
      }
    })
  })
})

import { expect } from 'chai'
import sinon from 'sinon'
import { makeConfig, nodeSources, createNodeSource, withNodeUrlFromTheEnvironment } from '../src/lib/config'

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

  describe('RSK_NODE_URL', function () {
    afterEach(() => sinon.restore())

    it('replaces the source of config.json with its one node, says so in one line without the URL, and leaves the file config as it is when unset or empty', () => {
      const log = sinon.stub(console, 'log')
      const fileConfig = {
        source: [{ url: 'http://file-node:4444' }, { url: 'http://file-node:4445' }],
        api: { port: 3003 }
      }

      const fromEnvironment = makeConfig(
        withNodeUrlFromTheEnvironment(fileConfig, { RSK_NODE_URL: 'https://env-node.test:4450/key' })
      )
      const lines = log.args.map(([line]) => line)
      const unset = withNodeUrlFromTheEnvironment(fileConfig, {})
      const empty = withNodeUrlFromTheEnvironment(fileConfig, { RSK_NODE_URL: '' })
      log.restore()

      expect(fromEnvironment.source).to.deep.equal({
        protocol: 'https',
        node: 'env-node.test',
        port: '4450',
        url: 'https://env-node.test:4450/key'
      })
      expect(fromEnvironment.blocks.source).to.equal(fromEnvironment.source)
      expect(fromEnvironment.api.port).to.equal(3003)
      expect(lines).to.deep.equal(['RSK_NODE_URL from the environment replaces the source in config.json'])
      expect(unset).to.equal(fileConfig)
      expect(empty).to.equal(fileConfig)
    })

    it('refuses an RSK_NODE_URL that is not an http or https URL, naming the variable and not its value', () => {
      const refusal = value => {
        try {
          withNodeUrlFromTheEnvironment({}, { RSK_NODE_URL: value })
        } catch (error) {
          return error.message
        }
      }

      expect(['not a url', 'secret-key-123:pass@env-node.test'].map(refusal)).to.deep.equal([
        'RSK_NODE_URL is not a URL',
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

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
    const FILE_URL = 'https://bitcoin-mainnet.example.com/v2/from-config-json'
    const originalEnv = process.env.BITCOIN_RPC_URL

    function capturingWarnings (run) {
      const original = console.warn
      const warnings = []
      console.warn = message => warnings.push(message)
      try {
        return { result: run(), warnings }
      } finally {
        console.warn = original
      }
    }

    afterEach(function () {
      if (originalEnv === undefined) delete process.env.BITCOIN_RPC_URL
      else process.env.BITCOIN_RPC_URL = originalEnv
    })

    it('takes the endpoint from the environment when config.json says nothing', function () {
      process.env.BITCOIN_RPC_URL = ENV_URL

      const { result, warnings } = capturingWarnings(() => makeConfig({}))

      expect(result.bitcoin.rpcUrl).to.equal(ENV_URL)
      expect(warnings).to.deep.equal([])
    })

    it('overrides a config.json endpoint and says so, because that file is not the place for a credential', function () {
      process.env.BITCOIN_RPC_URL = ENV_URL

      const { result, warnings } = capturingWarnings(() => makeConfig({ bitcoin: { rpcUrl: FILE_URL } }))

      expect(result.bitcoin.rpcUrl).to.equal(ENV_URL)
      expect(warnings).to.have.lengthOf(1)
      expect(warnings[0]).to.contain('BITCOIN_RPC_URL takes precedence')
    })

    it('keeps the config.json endpoint when the environment sets none', function () {
      delete process.env.BITCOIN_RPC_URL

      const { result, warnings } = capturingWarnings(() => makeConfig({ bitcoin: { rpcUrl: FILE_URL } }))

      expect(result.bitcoin.rpcUrl).to.equal(FILE_URL)
      expect(warnings).to.deep.equal([])
    })

    it('falls back to a local node when neither the environment nor config.json names one', function () {
      delete process.env.BITCOIN_RPC_URL

      const { result } = capturingWarnings(() => makeConfig({}))

      expect(result.bitcoin.rpcUrl).to.equal('http://localhost:8332')
    })
  })
})
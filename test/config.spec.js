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

  describe('NODE_URL', function () {
    afterEach(() => sinon.restore())

    it('replaces the source of config.json with its one node, says so in one line without the URL, and leaves the file config as it is when unset', () => {
      const log = sinon.stub(console, 'log')
      const fileConfig = { source: [{ url: 'http://file-node:4444' }, { url: 'http://file-node:4445' }], api: { port: 3003 } }

      const fromEnvironment = makeConfig(withNodeUrlFromTheEnvironment(fileConfig, { NODE_URL: 'https://env-node.test:4450/key' }))
      const lines = log.args.map(([line]) => line)
      const unset = withNodeUrlFromTheEnvironment(fileConfig, {})
      log.restore()

      expect(fromEnvironment.source).to.deep.equal({ protocol: 'https', node: 'env-node.test', port: '4450', url: 'https://env-node.test:4450/key' })
      expect(fromEnvironment.blocks.source).to.equal(fromEnvironment.source)
      expect(fromEnvironment.api.port).to.equal(3003)
      expect(lines).to.deep.equal(['NODE_URL from the environment replaces the source in config.json'])
      expect(unset).to.equal(fileConfig)
    })

    it('refuses a NODE_URL that is not an http or https URL, naming the variable and not its value', () => {
      const refusal = value => { try { withNodeUrlFromTheEnvironment({}, { NODE_URL: value }) } catch (error) { return error.message } }

      expect(['localhost:4444', 'not a url', 'ws://env-node.test:4445'].map(refusal)).to.deep.equal([
        'NODE_URL must be an http or https URL: got localhost:',
        'NODE_URL is not a URL',
        'NODE_URL must be an http or https URL: got ws:'
      ])
    })
  })
})

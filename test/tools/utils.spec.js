import { expect } from 'chai'
import sinon from 'sinon'
import { parseArguments, exitOnUncaughtException } from '../../src/tools/utils.js'

describe('exitOnUncaughtException', () => {
  afterEach(() => sinon.restore())

  function handle (error) {
    const on = sinon.stub(process, 'on')
    const exit = sinon.stub(process, 'exit')
    const log = sinon.stub(console, 'log')
    const stderr = sinon.stub(console, 'error')
    exitOnUncaughtException('[Tool t]: Error', () => 'Stopped: {"blocksRead":3}')
    on.withArgs('uncaughtException').firstCall.args[1](error)
    sinon.restore()
    return { stdout: log.args.map(a => a.join(' ')), stderr: stderr.args.map(a => String(a[0])), exits: exit.args }
  }

  it('prints a code error with its stack, so the bug keeps its file and line, then the run report, and exits 1', () => {
    const error = new TypeError("Cannot read properties of null (reading 'field')")

    const { stdout, stderr, exits } = handle(error)

    expect(stdout).to.deep.equal([
      "[Tool t]: Error: Cannot read properties of null (reading 'field')",
      'Stopped: {"blocksRead":3}'
    ])
    expect(stderr).to.deep.equal([error.stack])
    expect(exits).to.deep.equal([[1]])
  })

  it('prints a refused connection without a stack, as its location is in Node, not in this code', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:1'), {
      syscall: 'connect',
      code: 'ECONNREFUSED'
    })

    const { stdout, stderr, exits } = handle(error)

    expect(stdout).to.deep.equal(['[Tool t]: Error: connect ECONNREFUSED 127.0.0.1:1', 'Stopped: {"blocksRead":3}'])
    expect(stderr).to.deep.equal([])
    expect(exits).to.deep.equal([[1]])
  })
})

describe('parseArguments', () => {
  // Mock process.argv for testing
  let originalArgv

  beforeEach(() => {
    originalArgv = process.argv
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  const mockArgv = (args) => {
    process.argv = ['node', 'test.js', ...args]
  }

  describe('basic functionality', () => {
    it('should return default values when no arguments provided', () => {
      mockArgv([])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' },
        '--count': { name: 'count', type: 'number', default: 10 },
        '--save': { name: 'save', type: 'boolean', default: false }
      }

      const result = parseArguments(validOptions)

      expect(result).to.deep.equal({
        name: 'default',
        count: 10,
        save: false
      })
    })

    it('should parse string arguments correctly', () => {
      mockArgv(['--name', 'test-value'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' }
      }

      const result = parseArguments(validOptions)

      expect(result.name).to.equal('test-value')
    })

    it('should parse number arguments correctly', () => {
      mockArgv(['--count', '42'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0 }
      }

      const result = parseArguments(validOptions)

      expect(result.count).to.equal(42)
    })

    it('should handle multiple arguments', () => {
      mockArgv(['--name', 'test', '--count', '100'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' },
        '--count': { name: 'count', type: 'number', default: 0 },
        '--save': { name: 'save', type: 'boolean', default: false }
      }

      const result = parseArguments(validOptions)

      expect(result).to.deep.equal({
        name: 'test',
        count: 100,
        save: false
      })
    })
  })

  describe('validation', () => {
    it('should throw error for unknown option', () => {
      mockArgv(['--unknown', 'value'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' }
      }

      expect(() => parseArguments(validOptions)).to.throw("Unknown option '--unknown'")
    })

    it('should throw error when option value is missing', () => {
      mockArgv(['--name'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' }
      }

      expect(() => parseArguments(validOptions)).to.throw('--name requires a value')
    })

    it('should throw error for invalid number', () => {
      mockArgv(['--count', 'not-a-number'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0 }
      }

      expect(() => parseArguments(validOptions)).to.throw('--count value must be a number')
    })

    it('should throw error for number below minimum', () => {
      mockArgv(['--count', '-5'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0, min: 0 }
      }

      expect(() => parseArguments(validOptions)).to.throw('--count value must be a number >= 0')
    })

    it('should throw error for number above maximum', () => {
      mockArgv(['--count', '150'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0, max: 100 }
      }

      expect(() => parseArguments(validOptions)).to.throw('--count value must be a number <= 100')
    })

    it('should throw error for number outside range', () => {
      mockArgv(['--count', '50'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0, min: 10, max: 20 }
      }

      expect(() => parseArguments(validOptions)).to.throw('--count value must be a number >= 10 <= 20')
    })

    it('should throw error for empty required string', () => {
      mockArgv(['--name', ''])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: null, required: true }
      }

      expect(() => parseArguments(validOptions)).to.throw('--name requires a non-empty value')
    })
  })

  describe('required options', () => {
    it('should throw error when required option is missing', () => {
      mockArgv([])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: null, required: true }
      }

      expect(() => parseArguments(validOptions)).to.throw('--name is required')
    })

    it('should not throw error when required option is provided', () => {
      mockArgv(['--name', 'test'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: null, required: true }
      }

      const result = parseArguments(validOptions)
      expect(result.name).to.equal('test')
    })

    it('should handle multiple required options', () => {
      mockArgv(['--name', 'test', '--id', '123'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: null, required: true },
        '--id': { name: 'id', type: 'number', default: null, required: true }
      }

      const result = parseArguments(validOptions)
      expect(result).to.deep.equal({
        name: 'test',
        id: 123
      })
    })
  })

  describe('edge cases', () => {
    it('should handle zero as valid number', () => {
      mockArgv(['--count', '0'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 10 }
      }

      const result = parseArguments(validOptions)
      expect(result.count).to.equal(0)
    })

    it('should handle negative numbers when no min constraint', () => {
      mockArgv(['--count', '-5'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0 }
      }

      const result = parseArguments(validOptions)
      expect(result.count).to.equal(-5)
    })

    it('should handle empty string for non-required string option', () => {
      mockArgv(['--name', ''])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' }
      }

      const result = parseArguments(validOptions)
      expect(result.name).to.equal('')
    })

    it('should handle large numbers', () => {
      mockArgv(['--count', '999999999'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0 }
      }

      const result = parseArguments(validOptions)
      expect(result.count).to.equal(999999999)
    })

    it('should handle boolean flags', () => {
      mockArgv(['--save'])

      const validOptions = {
        '--save': { name: 'save', type: 'boolean', default: false }
      }

      const result = parseArguments(validOptions)
      expect(result.save).to.equal(true)
    })

    it('should handle boolean flags with other arguments', () => {
      mockArgv(['--name', 'test', '--save', '--count', '100'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' },
        '--save': { name: 'save', type: 'boolean', default: false },
        '--count': { name: 'count', type: 'number', default: 0 }
      }

      const result = parseArguments(validOptions)
      expect(result).to.deep.equal({
        name: 'test',
        save: true,
        count: 100
      })
    })

    it('should handle multiple boolean flags', () => {
      mockArgv(['--save', '--verbose'])

      const validOptions = {
        '--save': { name: 'save', type: 'boolean', default: false },
        '--verbose': { name: 'verbose', type: 'boolean', default: false }
      }

      const result = parseArguments(validOptions)
      expect(result).to.deep.equal({
        save: true,
        verbose: true
      })
    })
  })

  describe('real-world scenarios', () => {
    it('should handle updateContractsData options', () => {
      mockArgv(['--block', '5000000', '--pageSize', '25', '--limit', '100'])

      const validOptions = {
        '--block': { name: 'blockNumber', type: 'number', default: null, min: 0 },
        '--pageSize': { name: 'pageSize', type: 'number', default: 50, min: 1 },
        '--limit': { name: 'limit', type: 'number', default: 0, min: 0 }
      }

      const result = parseArguments(validOptions)
      expect(result).to.deep.equal({
        blockNumber: 5000000,
        pageSize: 25,
        limit: 100
      })
    })

    it('should handle getContractData options', () => {
      mockArgv(['--address', '0x1234567890abcdef', '--block', '5000000'])

      const validOptions = {
        '--address': { name: 'address', type: 'string', default: null, required: true },
        '--block': { name: 'blockNumber', type: 'number', default: null, min: 0 }
      }

      const result = parseArguments(validOptions)
      expect(result).to.deep.equal({
        address: '0x1234567890abcdef',
        blockNumber: 5000000
      })
    })

    it('should handle partial options (some defaults)', () => {
      mockArgv(['--block', '5000000'])

      const validOptions = {
        '--block': { name: 'blockNumber', type: 'number', default: null, min: 0 },
        '--pageSize': { name: 'pageSize', type: 'number', default: 50, min: 1 },
        '--limit': { name: 'limit', type: 'number', default: 0, min: 0 },
        '--save': { name: 'save', type: 'boolean', default: false }
      }

      const result = parseArguments(validOptions)
      expect(result).to.deep.equal({
        blockNumber: 5000000,
        pageSize: 50,
        limit: 0,
        save: false
      })
    })

    it('should handle getContractData with save flag', () => {
      mockArgv(['--address', '0x1234567890abcdef', '--save'])

      const validOptions = {
        '--address': { name: 'address', type: 'string', default: null, required: true },
        '--block': { name: 'blockNumber', type: 'number', default: null, min: 0 },
        '--save': { name: 'save', type: 'boolean', default: false }
      }

      const result = parseArguments(validOptions)
      expect(result).to.deep.equal({
        address: '0x1234567890abcdef',
        blockNumber: null,
        save: true
      })
    })
  })

  describe('error messages', () => {
    it('should provide clear error message for unknown option', () => {
      mockArgv(['--invalid', 'value'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' }
      }

      expect(() => parseArguments(validOptions)).to.throw("Unknown option '--invalid'")
    })

    it('should provide clear error message for missing value', () => {
      mockArgv(['--name'])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: 'default' }
      }

      expect(() => parseArguments(validOptions)).to.throw('--name requires a value')
    })

    it('should provide clear error message for invalid number', () => {
      mockArgv(['--count', 'abc'])

      const validOptions = {
        '--count': { name: 'count', type: 'number', default: 0 }
      }

      expect(() => parseArguments(validOptions)).to.throw('--count value must be a number')
    })

    it('should provide clear error message for required option', () => {
      mockArgv([])

      const validOptions = {
        '--name': { name: 'name', type: 'string', default: null, required: true }
      }

      expect(() => parseArguments(validOptions)).to.throw('--name is required')
    })
  })
})

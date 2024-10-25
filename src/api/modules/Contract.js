import { verificationResultsRepository } from '../../repositories'
import { DataCollectorItem } from '../lib/DataCollector'

export class Contract extends DataCollectorItem {
  constructor (name) {
    const cursorField = 'address'
    const sortDir = -1
    const sortable = { address: sortDir }
    super(name, { cursorField, sortDir, sortable })
    this.publicActions = {
      /**
       * @swagger
       * /api?module=contract&action=getsourcecode:
       *    get:
       *      description: get contract source code
       *      tags:
       *        - contract
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [contract]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getsourcecode]
       *        - $ref: '#/parameters/address'
      */
      getsourcecode: async params => {
        try {
          const { address } = params
          if (!address) throw new Error('Address is required')

          const result = []
          const verification = await verificationResultsRepository.findOne({ address })

          if (verification) result.push(mapToRemixFormat(verification))

          const data = {
            message: 'OK',
            result,
            status: '1'
          }

          return { data }
        } catch (error) {
          return Promise.reject(error)
        }
      }
    }
  }
}

function mapToRemixFormat (verification) {
  if (!verification.address) throw new Error('Invalid verification address')
  if (!verification.result) throw new Error('Invalid verification result')

  const { address, result } = verification

  if (!result.name) throw new Error('Invalid verification result name')
  const { name, usedSettings, abi, usedSources } = result
  const { evmVersion, optimizer, compiler } = usedSettings

  const data = {
    // TODO: Check for missing fields if any
    AdditionalSources: [], // TODO
    CompilerSettings: {}, // TODO
    ConstructorArguments: '', // TODO
    OptimizationRuns: 0, // TODO
    ImplementationAddress: '', // TODO
    ImplementationAddresses: [], // TODO
    IsProxy: false, // TODO
    SourceCode: usedSources.find(source => source.name === `${name}.sol`).contents,
    ABI: JSON.stringify(abi),
    ContractName: name,
    CompilerVersion: `v${compiler.version}`,
    OptimizationUsed: String(optimizer.enabled),
    EVMVersion: evmVersion,
    FileName: `${name}.sol`,
    Address: address
  }

  return data
}

export default Contract

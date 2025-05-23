import BigNumber from 'bignumber.js'
import nod3 from '../../lib/nod3Connect'
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
          let { address } = params
          if (typeof address !== 'string') throw new Error('Address is required')
          address = address.toLowerCase()

          const result = []
          const verification = await verificationResultsRepository.findOne({ address })

          if (verification) {
            const proxyData = await isERC1967Contract(address)
            result.push(mapToRemixFormat(verification, proxyData))
          }

          const data = {
            message: 'OK',
            result,
            status: '1'
          }

          return data
        } catch (error) {
          return Promise.reject(error)
        }
      }
    }
  }
}

function mapToRemixFormat (verification, proxyData) {
  if (!verification.address) throw new Error('Invalid verification address')
  if (!verification.result) throw new Error('Invalid verification result')

  const { address, result, sources } = verification

  if (!result.name) throw new Error('Invalid verification result name')
  const { name, usedSettings, abi, encodedConstructorArguments } = result
  const { evmVersion, optimizer, compiler, libraries, metadata, outputSelection } = usedSettings

  const sourceCodeByContractName = sources.find(source => source.name === `${name}.sol`)
  const defaultUsedSource = sources[0]
  const AdditionalSources = sources.map(({ name, contents }) => ({ SourceCode: contents, Filename: name }))

  const data = {
    AdditionalSources,
    CompilerSettings: {
      evmVersion: evmVersion || undefined,
      libraries: libraries || {},
      metadata: metadata || {},
      optimizer: optimizer || {},
      outputSelection: outputSelection || {}
    },
    ConstructorArguments: encodedConstructorArguments,
    OptimizationRuns: 0,
    ImplementationAddress: proxyData.implementationAddress,
    ImplementationAddresses: [proxyData.implementationAddress],
    IsProxy: String(proxyData.isProxy),
    SourceCode: sourceCodeByContractName && sourceCodeByContractName.contents ? sourceCodeByContractName.contents : defaultUsedSource.contents,
    ABI: JSON.stringify(abi),
    ContractName: name,
    CompilerVersion: `v${compiler.version}`,
    OptimizationUsed: String(optimizer.enabled),
    EVMVersion: evmVersion,
    FileName: `${name}.sol`,
    Address: address
  }

  if (!proxyData.isProxy) {
    delete data.ImplementationAddress
    delete data.ImplementationAddresses
  }

  if (!optimizer.enabled) {
    delete data.OptimizationRuns
  } // Maybe its not necessary to delete this field

  if (!evmVersion) {
    delete data.CompilerSettings.evmVersion
  }

  return data
}

async function isERC1967Contract (address) {
  // check For ERC1967
  // https://eips.ethereum.org/EIPS/eip-1967
  // 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc storage address where the implementation address is stored
  const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
  const storedValue = await nod3.eth.getStorageAt(address, implementationSlot)
  const isProxy = !!BigNumber(storedValue).comparedTo(BigNumber(0))
  /*
    BigNumber(x).comparedTo(BigNumber(n)) values:
    1 -> x is greater than n
    -1 -> x is less than n
    0 -> x equals n
    null -> x or n is NaN
  */

  if (isProxy) {
    const implementationAddress = `0x${storedValue.slice(-40)}` // extract contract address
    return { isProxy, implementationAddress }
  } else {
    return { isProxy, implementationAddress: storedValue }
  }
}

export default Contract

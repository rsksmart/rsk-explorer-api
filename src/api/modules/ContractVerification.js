import { DataCollectorItem } from '../lib/DataCollector'
import { StoredConfig } from '../../lib/StoredConfig'
import { versionsId } from '../../services/userEvents/ContractVerifierModule'
import { Error404, Error400, InvalidAddressError } from '../lib/Errors'
import { ObjectID } from 'mongodb'
import { EVMversions } from '../../lib/types'

export class ContractVerification extends DataCollectorItem {
  constructor (collections, name) {
    const { ContractVerification, VerificationsResults } = collections
    super(ContractVerification, name)
    this.verificationsCollection = VerificationsResults
    this.publicActions = {
      verify: async (params) => {
        try {
          const { request } = params
          if (!request) throw new InvalidAddressError()
          const { address } = request
          const aData = await this.parent.getModule('Address').run('getCode', { address })
          const { data } = aData
          if (!data) throw new Error400('Unknown address or address is not a contract')

          // TODO Check if has pending verifications

          const { creationCode, code } = data
          if (!creationCode) throw new Error404('Contract creation data not found')

          // Contract verifier payload
          request.bytecode = creationCode
          request.deployedBytecode = code
          return { data: request }
        } catch (err) {
          return Promise.reject(err)
        }
      },

      getSolcVersions: async () => {
        const data = await StoredConfig(this.parent.db).get(versionsId)
        return { data }
      },

      getEvmVersions: async () => {
        const data = EVMversions
        return { data }
      },

      getVerificationResult: async (params) => {
        try {
          let { id } = params
          if (!id) throw new Error('Invalid id')
          const _id = ObjectID(id)
          const verification = await this.getOne({ _id })
          if (verification && verification.data) {
            const { result, match } = verification.data
            return { data: { result, match } }
          }
        } catch (err) {
          return Promise.reject(err)
        }
      },

      /*  getVerifications: async (params) => {
         const query = verificationQuery(params)
         const data = await this.getPageData(query)
         return { data }
       },
       getLatestVerification: async (params) => {
         const query = verificationQuery(params)
         return this.getLatest(query)
       }, */

      isVerified: async (params) => {
        const { address } = params
        const data = await this.verificationsCollection.findOne({ address })
        return { data }
      }
    }
  }
}

/* function verificationQuery (params) {
  const { address, match } = params
  const query = (undefined !== match) ? { address, match: !!match } : { address }
  return query
} */

export default ContractVerification

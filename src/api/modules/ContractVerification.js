import { DataCollectorItem } from '../lib/DataCollector'
import { StoredConfig } from '../../lib/StoredConfig'
import { versionsId } from '../../services/userEvents/ContractVerifierModule'
import { Error404, Error400 } from '../lib/Errors'
export class ContractVerification extends DataCollectorItem {
  constructor (collections, name) {
    const { ContractVerification } = collections
    super(ContractVerification, name)

    this.publicActions = {
      verify: async (params) => {
        try {
          const { source, imports, settings, address, version } = params
          const aData = await this.parent.getModule('Address').run('getCode', { address })
          const { data } = aData
          if (!data) throw new Error400('Unknown address or address is not a contract')
          
          // TODO Check if is verified
          // if (data.source) throw new Error400('The contract source is already vefified')
          // TODO Check if have pending verifications

          const { creationCode } = data
          if (!creationCode) throw new Error404('Contract creation data not found')

          // Contract verifier payload
          const request = { source, imports, version, settings, address, bytecode: creationCode }
          return { data: request }
        } catch (err) {
          return Promise.reject(err)
        }
      },

      getVersions: async () => {
        const data = await StoredConfig(this.parent.db).get(versionsId)
        return { data }
      }
    }
  }
}

export default ContractVerification

import { DataCollectorItem } from '../lib/DataCollector'
import { StoredConfig } from '../../lib/StoredConfig'
import { versionsId, getVerificationId } from '../../services/userEvents/ContractVerifierModule'
import { Error404, Error400, InvalidAddressError } from '../lib/Errors'
// import { ObjectID } from 'mongodb'
import { EVMversions } from '../../lib/types'

export class ContractVerification extends DataCollectorItem {
  constructor (collections, name) {
    const { ContractVerification } = collections
    super(ContractVerification, name)
    this.publicActions = {
      /**
     * @swagger
     * /api?module=contractVerifier&action=getVerifiedContracts:
     *    get:
     *      description: Gets a list of verified contracts addresses
     *      tags:
     *        - contract verifier
     *      responses:
     *        200:
     *          $ref: '#/definitions/Response'
     *        400:
     *          $ref: '#/responses/BadRequest'
     *        404:
     *          $ref: '#/responses/NotFound'
     */
      getVerifiedContracts: (params) => {
        return this.parent.getModule('VerificationResults').run('getResults', params)
      },
      /**
       * @swagger
       * /api?module=contractVerifier&action=verify:
       *    get:
       *      description: Verify contract source
       *      tags:
       *        - contract verifier
       *      parameters:
       *        - name: request
       *          in: query
       *          required: true
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      verify: async (params) => {
        try {
          const { request } = params
          if (!request) throw new InvalidAddressError()
          const { address } = request
          const aData = await this.parent.getModule('Address').run('getCode', { address })
          const { data } = aData
          if (!data) throw new Error400('Unknown address or address is not a contract')

          // TODO Check if has pending verifications

          // const { creationCode, code } = data
          const { creationCode } = data
          if (!creationCode) throw new Error404('Contract creation data not found')

          // Contract verifier payload
          request.bytecode = creationCode
          // request.deployedBytecode = code
          request._id = getVerificationId(request)
          return { data: request }
        } catch (err) {
          return Promise.reject(err)
        }
      },
      /**
       * @swagger
       * /api?module=contractVerifier&action=getSolcVersions:
       *    get:
       *      description: Gets solidity compiler versions
       *      tags:
       *        - contract verifier
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getSolcVersions: async () => {
        const data = await StoredConfig(this.parent.db).get(versionsId)
        return { data }
      },
      /**
       * @swagger
       * /api?module=contractVerifier&action=getEvmVersions:
       *    get:
       *      description: Gets evm versions
       *      tags:
       *        - contract verifier
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getEvmVersions: async () => {
        const data = EVMversions
        return { data }
      },
      /**
       * @swagger
       * /api?module=contractVerifier&action=getVerificationResult:
       *    get:
       *      description: Gets the result of source code verification
       *      tags:
       *        - contract verifier
       *      parameters:
       *        - name: id
       *          in: query
       *          required: true
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getVerificationResult: async (params) => {
        try {
          let { id } = params
          if (!id) throw new Error('Invalid id')
          const verification = await this.getOne({ _id: id })
          if (verification && verification.data) {
            const { result, match } = verification.data
            return { data: { result, match } }
          }
        } catch (err) {
          return Promise.reject(err)
        }
      },
      /**
       * @swagger
       * /api?module=contractVerifier&action=isVerified:
       *    get:
       *      description: Checks if a contract was verified
       *      tags:
       *        - contract verifier
       *      parameters:
       *        - name: address
       *          in: query
       *          required: true
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      isVerified: async (params) => {
        return this.parent.getModule('VerificationResults').run('getVerification', params)
      }
    }
  }
}

export default ContractVerification

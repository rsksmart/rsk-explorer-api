import { verificationResultsEntityToRaw, rawVerificationResultsToEntity } from '../converters/verificationResults.converters'
import { verificationStatus } from '../lib/types'
import { generateFindQuery } from './utils'

// `success` is the only status asserting the compiled bytecode reproduced the deployed
// bytecode, which is what makes a stored ABI authoritative rather than merely present.
export const verifiedFilter = { status: verificationStatus.SUCCESS }
export const verifiedQuery = (address) => ({ ...verifiedFilter, address })

export function getVerificationResultsRepository (prismaClient) {
  return {
    async find (query, project = {}, sort = {}, limit = 0) {
      const verificationResults = await prismaClient.verification_result.findMany(generateFindQuery(query, project, null, sort, limit))
      return Object.keys(project) ? verificationResults : verificationResults.map(verificationResultsEntityToRaw)
    },
    async findOne (query, project = {}) {
      const verificationResult = await prismaClient.verification_result.findFirst(generateFindQuery(query, project))
      return verificationResult ? verificationResultsEntityToRaw(verificationResult) : verificationResult
    },
    async findVerifiedAbi (address) {
      const row = await prismaClient.verification_result.findFirst(
        generateFindQuery(verifiedQuery(address), {}, {}, { timestamp: -1 })
      )
      if (!row) return null

      const { abi } = verificationResultsEntityToRaw(row)
      return Array.isArray(abi) && abi.length ? abi : null
    },
    insertOne (data) {
      return prismaClient.verification_result.create({ data: rawVerificationResultsToEntity(data) })
    }
  }
}

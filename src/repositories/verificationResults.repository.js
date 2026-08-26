import { verificationResultsEntityToRaw, rawVerificationResultsToEntity } from '../converters/verificationResults.converters'
import { verificationStatus } from '../lib/types'
import { generateFindQuery } from './utils'

export const verifiedFilter = { status: verificationStatus.SUCCESS }
export const verifiedQuery = (address) => ({ ...verifiedFilter, address })
const deterministicNewestFirst = { timestamp: { sort: 'desc', nulls: 'last' }, id: 'desc' }

export function getVerificationResultsRepository (prismaClient) {
  const findFirst = async (query, project = {}, sort = {}) => {
    const verificationResult = await prismaClient.verification_result.findFirst(generateFindQuery(query, project, {}, sort))
    return verificationResult ? verificationResultsEntityToRaw(verificationResult) : verificationResult
  }

  return {
    async find (query, project = {}, sort = {}, limit = 0) {
      const verificationResults = await prismaClient.verification_result.findMany(generateFindQuery(query, project, null, sort, limit))
      return Object.keys(project) ? verificationResults : verificationResults.map(verificationResultsEntityToRaw)
    },
    findOne: findFirst,
    findNewestVerified: (address) => findFirst(verifiedQuery(address), {}, deterministicNewestFirst),
    async findDecodableVerifiedAbi (address) {
      const row = await prismaClient.verification_result.findFirst(
        generateFindQuery(verifiedQuery(address), { abi: true }, {}, deterministicNewestFirst)
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

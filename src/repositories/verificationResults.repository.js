import { verificationResultsEntityToRaw, rawVerificationResultsToEntity } from '../converters/verificationResults.converters'
import { generateFindQuery } from './utils'

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
    insertOne (data) {
      return prismaClient.verification_result.create({ data: rawVerificationResultsToEntity(data) })
    }
  }
}

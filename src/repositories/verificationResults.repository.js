import { verificationResultsEntityToRaw, rawVerificationResultsToEntity } from '../converters/verificationResults.converters'

export function getVerificationResultsRepository (prismaClient) {
  return {
    async find (query) {
      const verificationResults = await prismaClient.verification_result.findMany({ where: query })

      return verificationResults.map(verificationResultsEntityToRaw)
    },
    async findOne (query) {
      const verificationResult = await prismaClient.verification_result.findFirst({ where: query })

      return verificationResult ? verificationResultsEntityToRaw(verificationResult) : verificationResult
    },
    insertOne (data) {
      return prismaClient.verification_result.create({ data: rawVerificationResultsToEntity(data) })
    }
  }
}

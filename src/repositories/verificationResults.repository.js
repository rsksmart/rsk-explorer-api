import { prismaClient } from '../lib/Setup'
import { verificationResultsEntityToRaw, rawVerificationResultsToEntity } from '../converters/verificationResults.converters'

export const verificationResultsRepository = {
  async findOne (query) {
    const verificationResult = await prismaClient.verification_result.findFirst({ where: query })

    return verificationResult || verificationResultsEntityToRaw(verificationResult)
  },
  insertOne (data) {
    return prismaClient.verification_result.create({ data: rawVerificationResultsToEntity(data) })
  }
}

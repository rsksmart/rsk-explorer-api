import { prismaClient } from '../lib/Setup'

export const contractVerificationRepository = {
  async insertOne ({ _id, request, timestamp }) {
    const verificationToInsert = {
      _id,
      timestamp,
      request: request ? JSON.stringify(request) : ''
    }

    const verification = await prismaClient.contract_verification.create({ data: verificationToInsert })

    return verification
  },
  async updateOne ({ _id }, { error, result, match }) {
    const verificationToUpdate = {
      error: error ? JSON.stringify(error) : '',
      result: result ? JSON.stringify(result) : '',
      match: match ? JSON.stringify(match) : ''
    }

    const updatedVerification = await prismaClient.contract_verification.update({ where: _id, data: verificationToUpdate })
    return updatedVerification
  }
}

import { rawContractVerificationToEntity } from '../converters/contractVerification.converters'

export function getContractVerificationRepository (prismaClient) {
  return {
    insertOne (data) {
      const verification = prismaClient.contract_verification.create({
        data: rawContractVerificationToEntity(data, false)
      })

      return verification
    },
    updateOne ({ _id }, data) {
      const updatedVerification = prismaClient.contract_verification.update({
        where: _id,
        data: rawContractVerificationToEntity(data, true)
      })
      return updatedVerification
    }
  }
}

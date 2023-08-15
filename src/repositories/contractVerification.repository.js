import { rawContractVerificationToEntity, contractVerificationEntityToRaw } from '../converters/contractVerification.converters'

export function getContractVerificationRepository (prismaClient) {
  return {
    async findOne (query) {
      const verification = await prismaClient.contract_verification.findFirst({ where: query })

      return verification ? contractVerificationEntityToRaw(verification) : verification
    },
    insertOne (data) {
      const verification = prismaClient.contract_verification.create({
        data: rawContractVerificationToEntity(data)
      })

      return verification
    },
    updateOne ({ id }, data) {
      const updatedVerification = prismaClient.contract_verification.update({
        where: { id },
        data: rawContractVerificationToEntity(data, { updating: true })
      })
      return updatedVerification
    }
  }
}

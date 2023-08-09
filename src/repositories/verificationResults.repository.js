import { prismaClient } from '../lib/Setup'

export const verificationResultsRepository = {
  async findOne (query) {
    const res = await prismaClient.verification_result.findFirst({ where: query })
    const verificationResult = {
      _id: res._id,
      address: res.address,
      match: res.match,
      request: JSON.parse(res.request),
      result: JSON.parse(res.result),
      abi: JSON.parse(res.abi),
      sources: JSON.parse(res.sources),
      timestamp: res.timestamp
    }

    return verificationResult
  },
  async insertOne ({
    _id,
    address,
    match,
    request,
    result,
    abi,
    sources,
    timestamp
  }) {
    const verificationResultToInsert = {
      _id,
      address,
      match,
      request: JSON.stringify(request),
      result: JSON.stringify(result),
      abi: JSON.stringify(abi),
      sources: JSON.stringify(sources),
      timestamp
    }

    return prismaClient.verification_result.create({ data: verificationResultToInsert })
  }
}

import {prismaClient} from '../lib/Setup'
import { rawBalancesLogToEntity, entityToRawBalancesLog } from '../converters/balancesLog.converters'

export const balancesLogRepository = {
  async findOne (query = {}, project = {}, collection) {
    const prismaRes = entityToRawBalancesLog(await prismaClient.balances_log.findFirst({where: query}))
    return prismaRes
  },
  async insertOne (data, collection) {
    await prismaClient.balances_log.create({data: rawBalancesLogToEntity(data)})
    const mongoRes = await collection.insertOne(data)
    return mongoRes
  }
}

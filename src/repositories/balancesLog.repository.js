import {prismaClient} from '../lib/Setup'
import { rawBalancesLogToEntity, entityToRawBalancesLog } from '../converters/balancesLog.converters'

export const balancesLogRepository = {
  async findOne (query = {}, project = {}, collection) {
    const balancesLog = await prismaClient.balances_log.findFirst({where: query})
    return balancesLog ? entityToRawBalancesLog(balancesLog) : null
  },
  async insertOne (data, collection) {
    const balanceLog = await prismaClient.balances_log.create({data: rawBalancesLogToEntity(data)})
    return balanceLog
  }
}

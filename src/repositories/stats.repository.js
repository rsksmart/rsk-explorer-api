import { rawBridgeToEntity, rawCirculatingToEntity, rawStatsToEntity } from '../converters/stats.converters'
import {prismaClient} from '../lib/Setup'

export const statsRepository = {
  async insertOne (data, collection) {
    const newStats = rawStatsToEntity(data)

    if (data.circulating) {
      const newCirculating = await prismaClient.circulating.create({ data: rawCirculatingToEntity(data.circulating) })
      newStats.circulatingId = newCirculating.id
    }

    const newBridge = await prismaClient.bridge.create({ data: rawBridgeToEntity(data.bridge) })
    newStats.bridgeId = newBridge.id

    await prismaClient.stats.create({ data: newStats })

    await collection.insertOne(data)
  }
}

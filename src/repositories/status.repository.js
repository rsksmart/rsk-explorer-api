import { rawStatusToEntity } from '../converters/status.converters'
import {prismaClient} from '../lib/Setup'

export const statusRepository = {
  async insertOne (data, collection) {
    await prismaClient.status.create({ data: rawStatusToEntity(data) })
    await collection.insertOne(data)
  }
}

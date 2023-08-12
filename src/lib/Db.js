import { PrismaClient } from '@prisma/client'
import { config } from './config'

const {
  protocol,
  host,
  port,
  databaseName,
  user,
  password
} = config.db

class Db {
  constructor () {
    this.protocol = protocol
    this.host = host
    this.port = port
    this.databaseName = databaseName
    this.user = user
    this.password = password

    if (user && password) {
      this.url = `${protocol}${user}:${password}@${host}:${port}/${databaseName}`
    } else {
      this.url = `${protocol}@${host}:${port}/${databaseName}`
    }

    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: this.url
        }
      },
      // log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty'
    })
  }

  getClient () {
    return this.prismaClient
  }
}

export const prismaClient = (new Db()).getClient()

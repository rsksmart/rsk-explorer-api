import { PrismaClient } from '@prisma/client'
import Logger from './Logger'

const log = Logger('[database]')
export class Db {
  constructor ({ protocol, host, port, databaseName, user, password }) {
    if (!databaseName) throw new Error('Missing database name')
    this.protocol = protocol
    this.host = host
    this.port = port
    this.databaseName = databaseName
    if (user && password) {
      this.url = `${protocol}${user}:${password}@${host}:${port}`
    } else {
      this.url = `${protocol}@${host}:${port}`
    }
    this.log = log
    this.prismaClient = null
    this.connect()
  }

  async connect () {
    try {
      this.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: this.url
          }
        },
        log: ['query', 'info', 'warn', 'error'],
        errorFormat: 'pretty'
      })
      this.log.info('Connected to Database!')
    } catch (error) {
      this.log.error('Error connecting to database')
      this.log.error(error)
      return Promise.reject(error)
    }
  }
}

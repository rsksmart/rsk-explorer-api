import { PrismaClient } from '@prisma/client'

export class Db {
  constructor ({ log, protocol, host, port, databaseName, user, password }) {
    if (!databaseName) throw new Error('Missing database name')
    this.protocol = protocol
    this.host = host
    this.port = port
    this.databaseName = databaseName
    if (user && password) {
      this.url = `${protocol}${user}:${password}@${host}:${port}/${databaseName}`
    } else {
      this.url = `${protocol}@${host}:${port}/${databaseName}`
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
        // log: ['query', 'info', 'warn', 'error'],
        errorFormat: 'pretty'
      })
      this.log.info(`New DB instance created by ${this.log.fields.name}`)
    } catch (error) {
      this.log.error('Error connecting to database')
      this.log.error(error)
      return Promise.reject(error)
    }
  }
}

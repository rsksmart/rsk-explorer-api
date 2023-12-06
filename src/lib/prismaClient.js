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

if (!user || !password) throw new Error('Missing database credentials in src/lib/defaultConfig.js')

const prismaClient = new PrismaClient({
  datasources: {
    db: {
      url: `${protocol}${user}:${password}@${host}:${port}/${databaseName}`
    }
  },
  // log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty'
})

// prismaClient.$on('query', (e) => {
//   console.log('Query: ' + e.query)
//   console.log('Params: ' + e.params)
//   console.log('Duration: ' + e.duration + 'ms')
// })

export { prismaClient }

import { Prisma, PrismaClient } from '@prisma/client'
import { config } from './config'

function getDatabaseUrl () {
  try {
    const {
      protocol,
      host,
      port,
      databaseName,
      user,
      password,
      connectionLimit
    } = config.db

    if (!user || !password) throw new Error('Missing database credentials in src/lib/defaultConfig.js')

    const databaseUrl = `${protocol}${user}:${password}@${host}:${port}/${databaseName}?connection_limit=${connectionLimit}`

    return databaseUrl
  } catch (error) {
    console.error('Error creating database URL')
    throw error
  }
}

function getPrismaExtensions () {
  try {
    const prismaQueriesLoggerExtension = Prisma.defineExtension({
      name: 'prismaQueriesLoggerExtension',
      query: {
        $allModels: {
          $allOperations ({ model, operation, args, query }) {
            console.dir({ model, operation, args, query }, { depth: null })
            return query(args)
          }
        }
      }
    })

    return [prismaQueriesLoggerExtension]
  } catch (error) {
    console.error('Error creating Prisma extensions')
    throw error
  }
}

export function createPrismaClient () {
  try {
    return new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl()
        }
      },
      errorFormat: 'pretty'
    })
  } catch (error) {
    console.error('Error creating Prisma client')
    throw error
  }
}

export function createExtendedPrismaClient () {
  try {
    return new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl()
        }
      },
      errorFormat: 'pretty'
    }).$extends(...getPrismaExtensions())
  } catch (error) {
    console.error('Error creating extended Prisma client')
    throw error
  }
}

// Use the extended client for debugging
// const prismaClient = createExtendedPrismaClient()

const prismaClient = createPrismaClient()

export { prismaClient }

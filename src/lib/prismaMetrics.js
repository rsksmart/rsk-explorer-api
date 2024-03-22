import { prismaClient } from './prismaClient'
import express from 'express'
import prom from 'prom-client'

export async function createMetricsServer ({ serviceName, port, log = console }) {
  const app = express()
  const register = new prom.Registry()
  prom.collectDefaultMetrics({ register })

  app.get(`/metrics`, async (_, res) => {
    res.set('Content-Type', prom.register.contentType)
    const prismaMetrics = await prismaClient.$metrics.prometheus()

    const metrics = await register.metrics()
    res.end(prismaMetrics + metrics)
  })

  app.listen(port, () => log.info(`Metrics for service ${serviceName} listening at http://localhost:${port}/metrics`))

  return app
}

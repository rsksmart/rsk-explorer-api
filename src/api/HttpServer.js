import http from 'http'
import express from 'express'
import apiRoutes from './routes/api'
import docRoutes from './routes/doc'
import config from '../lib/config'
import cors from 'cors'

export const HttpServer = ({ api, status, log }, send) => {
  const app = express()
  const httpServer = http.Server(app)

  app.set('etag', false)
  app.set('x-powered-by', false)

  app.use(cors())
  app.options('*', cors())

  // status
  app.get('/status', (req, res) => {
    const data = status.getState().data
    res.send(data)
  })

  // circulating supply
  app.get('/circulating/:field?', (req, res) => {
    let { field } = req.params
    let { data } = api.getCirculatingSupply()
    data = (field) ? `${data[field]}` : data
    res.send(data)
  })

  app.use('/api', apiRoutes({ log, api }, send))

  if (config.api.exposeDoc) {
    app.use('/doc', docRoutes({ log, app }))
  }

  // 404
  app.use((req, res, next) => res.status(404).send())
  return { httpServer, app }
}

export default HttpServer

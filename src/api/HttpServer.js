import http from 'http'
import express from 'express'

export const HttpServer = ({ blocks, status }) => {
  const app = express()
  const httpServer = http.Server(app)
  app.set('etag', false)
  app.set('x-powered-by', false)

  app.use('/status', (req, res) => {
    const data = status.getState().data
    res.send(data)
  })

  app.use('/circulating', (req, res) => {
    const data = blocks.getCirculatingSupply().data
    res.send(data)
  })

  // 404
  app.use((req, res, next) => res.status(404).send())
  return httpServer
}

export default HttpServer

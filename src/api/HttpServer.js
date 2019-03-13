import http from 'http'
import express from 'express'

export const HttpServer = ({ blocks, status }) => {
  const app = express()
  const httpServer = http.Server(app)
  app.set('etag', false)
  app.set('x-powered-by', false)

  app.use('/status', (req, res) => {
    res.send(status.state)
  })

  // 404
  app.use((req, res, next) => res.status(404).send())
  return httpServer
}

export default HttpServer

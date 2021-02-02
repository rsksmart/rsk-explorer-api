import express from 'express'
import bodyParser from 'body-parser'
const router = express.Router()

const Routes = ({ log, api }, send) => {
  const getResult = async ({ module, action, params }) => {
    try {
      const response = await api.run({ module, action, params })
      if (!response.result) throw new Error('Missing result')
      // if (!result.data) throw new Error('Missing data')
      return response
    } catch (err) {
      log.debug({ module, action, params })
      return Promise.reject(err)
    }
  }
  const sendResult = async ({ res, req, next }, payload) => {
    const { module, action } = payload
    let response
    try {
      if (!!module !== !!action) {
        res.status(400).send()
        return
      }
      if (!module && !action) response = { result: api.info() }
      else response = await getResult(payload)
      if (typeof send === 'function') send({ response, res, req, next, payload })
      else res.send(response.result)
    } catch (err) {
      res.status(404).send()
      log.error(err)
    }
  }

  router.get('/', (req, res, next) => {
    const params = req.query
    const { module, action } = params
    delete params.module
    delete params.action
    return sendResult({ res, req, next }, { module, action, params })
  })

  router.post('/', bodyParser.json(), (req, res, next) => {
    return sendResult({ res, req, next }, req.body)
  })

  return router
}

export default Routes

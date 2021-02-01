import express from 'express'
import bodyParser from 'body-parser'
const router = express.Router()

const Routes = ({ log, api }, send) => {
  const getResult = async ({ module, action, params }) => {
    try {
      const { result } = await api.run({ module, action, params })
      if (!result) throw new Error('Missing result')
      if (!result.data) throw new Error('Missing data')
      return result
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const sendResult = async ({ res, req, next }, payload) => {
    const { action } = payload
    let result
    try {
      if (!!module !== !!action) {
        res.status(400).send()
        return
      }
      if (!module && !action) result = api.info()
      else result = await getResult(payload)
      if (!result) throw new Error('Empty result')
      if (typeof send === 'function') send({ result, res, req, next, payload })
      else res.send(result)
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

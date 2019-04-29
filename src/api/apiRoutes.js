import express from 'express'
const router = express.Router()

const Routes = ({ log, api }) => {
  router.get('/', async (req, res, next) => {
    try {
      const params = req.query
      const { module, action } = req.query
      delete params.module
      delete params.action
      const { result } = await api.run({ module, action, params })
      res.send({ result })
    } catch (err) {
      res.status(404).send()
      log.error(err)
    }
  })
  return router
}

export default Routes

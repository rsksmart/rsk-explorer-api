import express from 'express'
import rskOpenapiUi from '@rsksmart/rsk-openapi-ui'
import path from 'path'
const router = express.Router()

const Routes = ({ log, app } = {}) => {
  app.use('/doc', express.static(rskOpenapiUi.getDistPath()))

  router.get('/swagger.json', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../../public/swagger.json'))
  })

  return router
}

export default Routes

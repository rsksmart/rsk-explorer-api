import express from 'express'
import stargateRoutes from './routes/stargate.routes'
import { config } from './lib/config'
import packageJson from '../../../package.json'
const router = express.Router()

router.get('/', (req, res) => {
  res.send({
    message: 'RSK Explorer API v3',
    network: config.network,
    version: packageJson.version
  })
})

router.use('/stargate', stargateRoutes)

export default router

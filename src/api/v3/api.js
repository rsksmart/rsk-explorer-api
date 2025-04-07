import express from 'express'
import stargateRoutes from './routes/stargate.routes'

const router = express.Router()

router.get('/', (req, res) => {
  res.send({
    message: 'RSK Explorer API v3'
  })
})

router.use('/stargate', stargateRoutes)

export default router

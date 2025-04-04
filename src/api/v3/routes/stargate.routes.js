import express from 'express'
import { validateStargateAddress } from '../controllers/stargate.controllers'

const router = express.Router()

router.get('/validate-address/:address', validateStargateAddress)

export default router

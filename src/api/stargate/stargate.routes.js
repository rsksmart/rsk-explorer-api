import express from 'express'
import { validateStargateAddress } from './stargate.controllers'
import httpLogger from '../httpLogger'
const router = express.Router()

router.use(httpLogger)
router.use(express.json())
router.use(express.urlencoded({ extended: true }))
router.get('/validate-stargate-address/:address', validateStargateAddress)

export default router

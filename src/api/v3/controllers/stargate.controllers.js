import { formatFiatBalance, getAddressBalance, getRBTCPrice } from '../utils'
import Logger from '../../../lib/Logger'
import config from '../../../lib/config'

const log = Logger('[v3.stargate.controllers]')

export const validateStargateAddress = async (req, res) => {
  try {
    const { address } = req.params
    const balance = await getAddressBalance(address)
    const rbtcPrice = await getRBTCPrice()
    const assetsValue = formatFiatBalance(balance * rbtcPrice)

    const isEligible = assetsValue > config.api.stargate.minAssetsValueThresholdInUSDT

    // todo: Normalize output according to Galxe standards
    const data = {
      result: isEligible ? 1 : 0,
      test: {
        address,
        balance,
        rbtcPrice,
        assetsValueInUSDT: assetsValue,
        isEligible,
        minAssetsValueThresholdInUSDT: config.api.stargate.minAssetsValueThresholdInUSDT
      }
    }

    res.send({ data })
  } catch (error) {
    log.error('Error validating stargate address')
    log.error(error)

    return res.status(500).send({
      error: 'Internal server error'
    })
  }
}

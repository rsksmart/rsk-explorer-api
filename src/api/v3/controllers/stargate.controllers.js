import { formatFiatBalance, getAddressBalance, getRBTCPrice } from '../utils'
import Logger from '../../../lib/Logger'
import config from '../../../lib/config'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'

const log = Logger('[v3.stargate.controllers]')

export const validateStargateAddress = async (req, res) => {
  try {
    const { address } = req.params

    if (!address || !isAddress(address)) {
      return res.status(400).send({
        error: 'A valid address is required'
      })
    }

    const balance = await getAddressBalance(address)
    const rbtcPrice = await getRBTCPrice()
    const assetsValueInUSDT = formatFiatBalance(balance * rbtcPrice)

    /*
     galxe expression:

      function(resp) {
        return resp.data.isEligible ? 1 : 0;
      }
    */

    res.send({
      data: {
        address,
        balance,
        rbtcPrice,
        assetsValueInUSDT,
        isEligible: assetsValueInUSDT > config.api.stargate.minAssetsValueThresholdInUSDT,
        minAssetsValueThresholdInUSDT: config.api.stargate.minAssetsValueThresholdInUSDT
      }
    })
  } catch (error) {
    log.error('Error validating stargate address')
    log.error(error)

    return res.status(500).send({
      error: 'Internal server error'
    })
  }
}

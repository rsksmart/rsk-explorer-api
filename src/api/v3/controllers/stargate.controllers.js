import { formatFiatBalance, getAddressBalance, getRBTCPrice } from '../utils'
import Logger from '../../../lib/Logger'
import config from '../../../lib/config'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'

const log = Logger('[v3.stargate.controllers]')

const ERRORS = {
  INVALID_ADDRESS: 'A valid address is required',
  INTERNAL_SERVER_ERROR: 'Internal server error'
}

export const validateStargateAddress = async (req, res) => {
  try {
    const { address } = req.params

    if (!address || !isAddress(address)) throw new Error(ERRORS.INVALID_ADDRESS)

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
      },
      error: false,
      errorMessage: null
    })
  } catch (error) {
    log.error('Error validating stargate address')
    log.error(error)

    if (error.message === ERRORS.INVALID_ADDRESS) {
      return res.status(400).send({
        error: true,
        errorMessage: ERRORS.INVALID_ADDRESS
      })
    }

    return res.status(500).send({
      error: true,
      errorMessage: ERRORS.INTERNAL_SERVER_ERROR
    })
  }
}

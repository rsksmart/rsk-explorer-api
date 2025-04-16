import Logger from '../../../lib/Logger'
import config from '../../../lib/config'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { getCurrentNetwork, getAssetsValueInUSDT } from '../utils'

const log = Logger('[v3.stargate.controllers]')

const ERRORS = {
  INVALID_ADDRESS: 'A valid address is required',
  INTERNAL_SERVER_ERROR: 'Internal server error'
}

export const validateStargateAddress = async (req, res) => {
  try {
    let { address } = req.params

    if (!address || !isAddress(address)) throw new Error(ERRORS.INVALID_ADDRESS)

    // normalize address
    address = address.toLowerCase()

    const network = await getCurrentNetwork()
    const allowedTokens = config.api.stargate.allowedTokens[network]
    const { balances, totalValueInUSDT } = await getAssetsValueInUSDT(address, allowedTokens)
    const minValueInUSDT = config.api.stargate.minValueInUSDT
    const isEligible = totalValueInUSDT > minValueInUSDT

    /*
     galxe expression:

      function(resp) {
        return resp.data.isEligible ? 1 : 0;
      }
    */

    res.send({
      data: {
        address,
        totalValueInUSDT,
        minValueInUSDT,
        isEligible,
        allowedTokens,
        balances
      },
      error: false,
      errorMessage: null
    })
  } catch (error) {
    log.error('validateStargateAddress(): Error validating stargate address')
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

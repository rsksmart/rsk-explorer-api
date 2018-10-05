import { errors, modules } from '../lib/types'
import config from '../lib/config'
const delayedFields = config.api.delayedFields || {}

export const formatRes = (payload) => {
  let { module, action, result, req, error } = payload
  let data, pages, next, prev, delayed
  if (!result && !error) error = errors.EMPTY_RESULT
  if (error) {
    error = formatError(error)
  } else {
    ({ data, pages, next, prev, delayed } = result)
  }
  if (!data && !error) {
    if (req.getDelayed && delayed && delayed.registry) {
      error = formatError(errors.UPDATING_REGISTRY)
    } else {
      error = formatError(errors.EMPTY_RESULT)
    }
  }
  return { module, action, data, req, pages, error, prev, next, delayed }
}

export const formatError = error => {
  error.serverTime = Date.now()
  return error
}

export const publicSettings = () => {
  return config.publicSettings
}

export const getDelayedFields = (module, action) => {
  let delayed = (delayedFields[module]) ? delayedFields[module][action] : null
  if (delayed) delayed.module = module
  return delayed
}

export const getModule = module => modules[module] || module

export { errors } from '../lib/types'

import { errors } from '../lib/types'
import config from '../lib/config'

export const formatRes = (action, result, req, error) => {
  let data, pages, next, prev, parentData, delayed
  if (!result && !error) error = errors.EMPTY_RESULT
  if (error) {
    error = formatError(error)
  } else {
    ({ data, pages, next, prev, parentData, delayed } = result)
  }
  if (!data && !error) error = formatError(errors.EMPTY_RESULT)
  return { action, data, req, pages, error, prev, next, delayed, parentData }
}

export const formatError = error => {
  error.serverTime = Date.now()
  return error
}

export const publicSettings = () => {
  return config.publicSettings
}

export { errors } from '../lib/types'

import { ApiError } from './ApiError'
import { errors } from './apiTools'

export const evaluateError = error => {
  let res = errors.INVALID_REQUEST
  if (ApiError.isApiError(error)) {
    res.code = error.code
    res.error = error.message
  }
  return res
}

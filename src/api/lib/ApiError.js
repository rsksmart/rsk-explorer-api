
const NAME = 'ApiError'
export class ApiError extends Error {
  constructor ({ status, message }, ...args) {
    super(...args)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }

    this.message = message || ''
    this.status = status || 400
    this.name = NAME
  }
  static isApiError (error = {}) {
    const { name } = error
    return name === NAME
  }
}

export default ApiError


import { ApiError } from './ApiError'
import { errors } from './apiTools'

export class Error500 extends ApiError {
  constructor (message, ...args) {
    const status = 500
    super({ status, message }, ...args)
  }
}

export class Error404 extends ApiError {
  constructor (message, ...args) {
    const status = 404
    super({ status, message }, ...args)
  }
}

export class Error400 extends ApiError {
  constructor (message, ...args) {
    const status = 404
    super({ status, message }, ...args)
  }
}

export class TemporarilyUnavailableError extends Error500 {
  constructor (...args) {
    super(errors.TemporarilyUnavailableError, ...args)
  }
}

export class NotFoundError extends Error404 {
  constructor (...args) {
    super(errors.NotFoundError, ...args)
  }
}

export class BadRequestError extends Error400 {
  constructor (...args) {
    super(errors.BadRequestError, ...args)
  }
}

export class InvalidAddressError extends ApiError {
  constructor (status, ...args) {
    const message = errors.InvalidAddressError
    status = status || 400
    super({ message, status }, ...args)
  }
}

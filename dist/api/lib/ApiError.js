"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.ApiError = void 0;
const NAME = 'ApiError';
class ApiError extends Error {
  constructor({ status, message }, ...args) {
    super(...args);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }

    this.message = message || '';
    this.status = status || 400;
    this.name = NAME;
  }
  static isApiError(error = {}) {
    const { name } = error;
    return name === NAME;
  }}exports.ApiError = ApiError;var _default =


ApiError;exports.default = _default;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.evaluateError = void 0;var _ApiError = require("./ApiError");
var _apiTools = require("./apiTools");

const evaluateError = error => {
  let res = _apiTools.errors.INVALID_REQUEST;
  if (_ApiError.ApiError.isApiError(error)) {
    res.code = error.code;
    res.error = error.message;
  }
  return res;
};exports.evaluateError = evaluateError;
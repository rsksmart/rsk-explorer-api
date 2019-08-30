"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.apiErrors = exports.apiError = void 0;const apiError = (code, error) => {
  return { code, error };
};exports.apiError = apiError;

const apiErrors = errors => {
  const apiErrors = {};
  for (let e in errors) {
    apiErrors[e] = apiError(e, errors[e]);
  }
  return apiErrors;
};exports.apiErrors = apiErrors;
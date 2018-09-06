"use strict";Object.defineProperty(exports, "__esModule", { value: true });const apiError = exports.apiError = (code, error) => {
  return { code, error };
};

const apiErrors = exports.apiErrors = errors => {
  const apiErrors = {};
  for (let e in errors) {
    apiErrors[e] = apiError(e, errors[e]);
  }
  return apiErrors;
};
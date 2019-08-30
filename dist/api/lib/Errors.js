"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.InvalidAddressError = exports.BadRequestError = exports.NotFoundError = exports.TemporarilyUnavailableError = exports.Error400 = exports.Error404 = exports.Error500 = void 0;
var _ApiError = require("./ApiError");
var _apiTools = require("./apiTools");

class Error500 extends _ApiError.ApiError {
  constructor(message, ...args) {
    const status = 500;
    super({ status, message }, ...args);
  }}exports.Error500 = Error500;


class Error404 extends _ApiError.ApiError {
  constructor(message, ...args) {
    const status = 404;
    super({ status, message }, ...args);
  }}exports.Error404 = Error404;


class Error400 extends _ApiError.ApiError {
  constructor(message, ...args) {
    const status = 404;
    super({ status, message }, ...args);
  }}exports.Error400 = Error400;


class TemporarilyUnavailableError extends Error500 {
  constructor(...args) {
    super(_apiTools.errors.TemporarilyUnavailableError, ...args);
  }}exports.TemporarilyUnavailableError = TemporarilyUnavailableError;


class NotFoundError extends Error404 {
  constructor(...args) {
    super(_apiTools.errors.NotFoundError, ...args);
  }}exports.NotFoundError = NotFoundError;


class BadRequestError extends Error400 {
  constructor(...args) {
    super(_apiTools.errors.BadRequestError, ...args);
  }}exports.BadRequestError = BadRequestError;


class InvalidAddressError extends _ApiError.ApiError {
  constructor(status, ...args) {
    const message = _apiTools.errors.InvalidAddressError;
    status = status || 400;
    super({ message, status }, ...args);
  }}exports.InvalidAddressError = InvalidAddressError;
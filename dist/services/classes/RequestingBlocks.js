"use strict";Object.defineProperty(exports, "__esModule", { value: true });const RequestingBlocks = exports.RequestingBlocks = {
  requesting: {},
  add(number, data) {
    data = data || true;
    if (Number.isInteger(number)) {
      this.requesting[number] = data;
    }
  },
  delete(number) {
    this.requesting[number] = null;
    delete this.requesting[number];
  },
  isRequested(number) {
    return this.requesting[number];
  },
  total() {
    return Object.keys(this.requesting).length;
  } };
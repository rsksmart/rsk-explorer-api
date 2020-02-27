"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.getEnabledApiModules = void 0;var _Block = require("./Block");
var _Tx = require("./Tx");
var _Address = require("./Address");
var _Event = require("./Event");
var _Token = require("./Token");
var _TxPending = require("./TxPending");
var _Stats = require("./Stats");
var _Summary = require("./Summary");

var _ContractVerification = require("./ContractVerification");
var _apiTools = require("../lib/apiTools");

const apiModules = { Block: _Block.Block, Tx: _Tx.Tx, Address: _Address.Address, Event: _Event.Event, Token: _Token.Token, TxPending: _TxPending.TxPending, Stats: _Stats.Stats, Summary: _Summary.Summary, ContractVerification: _ContractVerification.ContractVerification };

const getEnabledApiModules = modules => {
  const enabled = (0, _apiTools.getModulesNames)((0, _apiTools.getEnabledModules)(modules));
  return enabled.reduce((v, a) => {
    v[a] = apiModules[a];
    return v;
  }, {});
};exports.getEnabledApiModules = getEnabledApiModules;var _default =

apiModules;exports.default = _default;
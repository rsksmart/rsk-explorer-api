"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.apps = exports.paths = void 0;
var _servicesConfig = require("./servicesConfig");

const scripts = Object.values(_servicesConfig.servicesNames);

const scriptName = name => `${name}.js`;

const cwd = `${__dirname}/blocks/`;

const paths = scripts.map(name => cwd + scriptName(name));exports.paths = paths;

const apps = scripts.map(name => {
  let script = scriptName(name);
  return { name, script, cwd };
});exports.apps = apps;
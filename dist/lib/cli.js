"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.progressBar = exports.randomColor = exports.ansiCode = exports.log = exports.label = exports.example = exports.ok = exports.debug = exports.info = exports.warn = exports.error = exports.grey = exports.yellow = exports.orange = exports.green = exports.blue = exports.red = exports.reset = void 0;const reset = '\x1b[0m';exports.reset = reset;
const red = '\x1b[31m';exports.red = red;
const blue = '\x1b[36m';exports.blue = blue;
const green = '\x1b[32m';exports.green = green;
const orange = '\x1b[33m';exports.orange = orange;
const yellow = '\x1b[93m';exports.yellow = yellow;
const grey = '\x1b[90m';exports.grey = grey;

const error = l => console.log(red, l, reset);exports.error = error;
const warn = l => console.log(orange, l, reset);exports.warn = warn;
const info = l => console.log(blue, l, reset);exports.info = info;
const debug = l => console.log(yellow, l, reset);exports.debug = debug;
const ok = l => console.log(green, l, reset);exports.ok = ok;
const example = l => console.log(grey, l, reset);exports.example = example;
const label = l => console.log(green, l, reset);exports.label = label;
const logMethods = { error, warn, debug, info, label };

const log = new Proxy({}, {
  get(t, p) {
    return logMethods[p] || console.log;
  } });exports.log = log;


const ansiCode = number => `\x1b[${parseInt(number)}m`;exports.ansiCode = ansiCode;

const randomColor = () => ansiCode(Math.floor(Math.random() * (40 - 30 + 1)) + 30);exports.randomColor = randomColor;

const progressBar = (total, value, options = {}) => {
  let steps = options.steps || 10;
  let char = options.char || '■';
  let empty = options.empty || ' ';
  let close = options.close || '|';
  let percent = Math.floor(value * 100 / total);
  let bars = [...new Array(steps + 1)].
  map((v, i) => i * (100 / steps) < percent ? char : empty);
  bars.splice(Math.floor(bars.length / 2), 0, ` ${percent}% `);
  return `${close}${bars.join('')}${close}`;
};exports.progressBar = progressBar;
'use strict';Object.defineProperty(exports, "__esModule", { value: true });const reset = exports.reset = '\x1b[0m';
const red = exports.red = '\x1b[31m';
const blue = exports.blue = '\x1b[36m';
const green = exports.green = '\x1b[32m';
const orange = exports.orange = '\x1b[33m';

const error = exports.error = l => console.log(red, l, reset);
const warn = exports.warn = l => console.log(orange, l, reset);
const info = exports.info = l => console.log(blue, l, reset);
const ok = exports.ok = l => console.log(green, l, reset);

const ansiCode = exports.ansiCode = number => `\x1b[${parseInt(number)}m`;

const randomColor = exports.randomColor = () => ansiCode(Math.floor(Math.random() * (40 - 30 + 1)) + 30);

const progressBar = exports.progressBar = (total, value, options = {}) => {
  let steps = options.steps || 10;
  let char = options.char || '■';
  let empty = options.empty || ' ';
  let close = options.close || '|';
  let percent = Math.floor(value * 100 / total);
  let bars = [...new Array(steps + 1)].
  map((v, i) => i * (100 / steps) < percent ? char : empty);
  bars.splice(Math.floor(bars.length / 2), 0, ` ${percent}% `);
  return `${close}${bars.join('')}${close}`;
};
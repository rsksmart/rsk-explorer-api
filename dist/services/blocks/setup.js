"use strict";var _index = require("./index.js");

(0, _index.setupBlocks)().then(() => {
  process.exit(0);
}).catch(err => {
  console.log(err);
  process.exit(9);
});
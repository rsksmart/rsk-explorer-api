"use strict";var _serviceFactory = require("../serviceFactory");
var _ListenBlocks = require("../classes/ListenBlocks");

const serviceConfig = _serviceFactory.services.LISTENER;
const executor = ({ create }) => {create.Emitter();};

async function main() {
  try {
    const { log, db, initConfig } = await (0, _serviceFactory.bootStrapService)(serviceConfig);
    const { service, startService } = await (0, _serviceFactory.createService)(serviceConfig, executor, { log });
    await startService();
    const listener = new _ListenBlocks.ListenBlocks(db, { log, initConfig }, service);
    listener.start();
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

main();
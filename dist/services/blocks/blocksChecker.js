"use strict";var _serviceFactory = require("../serviceFactory");
var _CheckBlocks = require("../classes/CheckBlocks");

const serviceConfig = _serviceFactory.services.CHECKER;

async function main() {
  try {
    const { log, db, initConfig, events } = await (0, _serviceFactory.bootStrapService)(serviceConfig);
    const checker = new _CheckBlocks.CheckBlocks(db, { log, initConfig });
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_TIP_BLOCK:
          checker.updateTipBlock(data);
          break;}

    };
    const executor = ({ create }) => {
      create.Emitter();
      create.Listener(eventHandler);
    };

    const { startService, service } = await (0, _serviceFactory.createService)(serviceConfig, executor, { log });
    const { emit } = service;
    await startService();
    checker.start(emit);
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

main();
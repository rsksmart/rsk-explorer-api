"use strict";var _serviceFactory = require("../serviceFactory");
var _UpdateBlockBalances = require("../classes/UpdateBlockBalances");

const serviceConfig = _serviceFactory.services.BALANCES;

async function main() {
  try {
    const { log, db, initConfig, events } = await (0, _serviceFactory.bootStrapService)(serviceConfig);
    const balances = new _UpdateBlockBalances.UpdateBlockBalances(db, { log, initConfig });
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_TIP_BLOCK:
          balances.updateLastBlock(data);
          break;}

    };
    const executor = ({ create }) => {
      create.Emitter();
      create.Listener(eventHandler);
    };

    const { startService, service } = await (0, _serviceFactory.createService)(serviceConfig, executor, { log });
    const { emit } = service;
    await startService();
    balances.setEmitter(emit);
    balances.start();
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

main();
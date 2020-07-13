"use strict";var _serviceFactory = require("../serviceFactory");
var _BlocksStatus = require("../classes/BlocksStatus");

const serviceConfig = _serviceFactory.services.STATUS;

async function main() {
  try {
    const { log, db, initConfig, events } = await (0, _serviceFactory.bootStrapService)(serviceConfig);
    const Status = new _BlocksStatus.BlocksStatus(db, { log, initConfig });
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_STATUS:
          Status.update(data);
          break;}

    };
    const executor = ({ create }) => {create.Listener(eventHandler);};
    const { startService } = await (0, _serviceFactory.createService)(serviceConfig, executor, { log });
    await startService();
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

main();
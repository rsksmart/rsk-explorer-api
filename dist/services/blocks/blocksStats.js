"use strict";var _serviceFactory = require("../serviceFactory");
var _BcStats = require("../classes/BcStats");

const serviceConfig = _serviceFactory.services.STATS;

async function main() {
  try {
    const { log, db, initConfig, events } = await (0, _serviceFactory.bootStrapService)(serviceConfig);
    const Stats = new _BcStats.BcStats(db, { log, initConfig });
    const eventHandler = (event, data) => {
      switch (event) {
        case events.NEW_TIP_BLOCK:
          Stats.update(data);
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
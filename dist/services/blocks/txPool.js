"use strict";var _TxPool = require("../classes/TxPool");
var _serviceFactory = require("../serviceFactory");

const serviceConfig = _serviceFactory.services.TXPOOL;

const executor = ({ create }) => {create.Emitter();};

async function main() {
  try {
    const { log, db, initConfig } = await (0, _serviceFactory.bootStrapService)(serviceConfig);
    const { startService } = await (0, _serviceFactory.createService)(serviceConfig, executor, { log });
    await startService();
    const txPool = new _TxPool.TxPool(db, { log, initConfig });
    log.info(`Starting txPool`);
    txPool.start();
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

main();
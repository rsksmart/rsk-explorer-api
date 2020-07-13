"use strict";var _serviceFactory = require("../serviceFactory");
var _RequestBlocks = require("../classes/RequestBlocks");
var _config = _interopRequireDefault(require("../../lib/config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const serviceConfig = _serviceFactory.services.REQUESTER;

async function main() {
  try {
    const { log, db, initConfig, events } = await (0, _serviceFactory.bootStrapService)(serviceConfig);
    const Requester = new _RequestBlocks.RequestBlocks(db, Object.assign(Object.assign({}, _config.default.blocks), { log, initConfig }));
    const eventHandler = async (event, data) => {
      try {
        switch (event) {
          case events.NEW_BLOCK:
            let { key, prioritize } = data;
            Requester.request(key, prioritize);
            break;

          case events.REQUEST_BLOCKS:
            const { blocks } = data;
            Requester.bulkRequest(blocks);
            break;}

      } catch (err) {
        return Promise.reject(err);
      }
    };
    const executor = ({ create }) => {
      create.Emitter();
      create.Listener(eventHandler);
    };

    const { startService, service } = await (0, _serviceFactory.createService)(serviceConfig, executor, { log });
    const { emit } = service;
    Requester.setEmitter(emit);
    await startService();
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

main();
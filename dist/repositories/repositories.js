"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.REPOSITORIES = void 0;var _fs = _interopRequireDefault(require("fs"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const REPOSITORIES = _fs.default.readdirSync(__dirname).reduce((repos, repo) => {
  const [name] = repo.split('.');
  const [requiredRepo] = Object.values(require(`${__dirname}/${repo}`));

  repos[name[0].toUpperCase() + name.slice(1)] = requiredRepo;

  return repos;
}, {});exports.REPOSITORIES = REPOSITORIES;
import fs from 'fs'

export const REPOSITORIES = fs.readdirSync(__dirname).reduce((repos, repo) => {
  const [name] = repo.split('.')
  const [requiredRepo] = Object.values(require(`${__dirname}/${repo}`))

  repos[name[0].toUpperCase() + name.slice(1)] = requiredRepo

  return repos
}, {})

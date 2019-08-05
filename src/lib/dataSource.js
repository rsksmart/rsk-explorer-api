
import Setup from './Setup'
export const dataSource = Setup().then(setup => setup.start())
export const setup = (log) => Setup({ log }).then(setup => setup.start())
export default dataSource

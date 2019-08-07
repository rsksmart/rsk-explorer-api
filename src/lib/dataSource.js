
import Setup from './Setup'
export const setup = ({ log, skipCheck } = {}) => Setup({ log } = {}).then(setup => setup.start(skipCheck))
export const dataSource = setup
export default setup


import Logger from './Logger'
import Setup from './Setup'
export const setup = async ({ skipCheck } = {}) => {
  try {
    const log = Logger('[Setup]')
    const setup = await Setup({ log })
    return setup.start(skipCheck)
  } catch (err) {
    return Promise.reject(err)
  }
}
export const dataSource = setup
export default setup

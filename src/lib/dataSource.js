
import Setup from './Setup'
export const setup = async ({ log, skipCheck } = {}) => {
  try {
    const setup = await Setup({ log })
    return setup.start(skipCheck)
  } catch (err) {
    return Promise.reject(err)
  }
}
export const dataSource = setup
export default setup

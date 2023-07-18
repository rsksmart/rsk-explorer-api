
import Setup from './Setup'
export const dataSource = async ({ log = console, skipCheck } = {}) => {
  try {
    const setup = await Setup({ log })
    return setup.start(skipCheck)
  } catch (err) {
    return Promise.reject(err)
  }
}

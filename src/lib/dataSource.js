
import Logger from './Logger'
import Setup from './Setup'
export const dataSource = async ({ skipCheck } = {}) => {
  try {
    const log = Logger('[datasource]')
    const setup = await Setup({ log })
    return setup.start(skipCheck)
  } catch (err) {
    return Promise.reject(err)
  }
}

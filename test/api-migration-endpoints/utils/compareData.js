import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import chai from 'chai'
import axios from 'axios'
import config from '../config/settings'
import getObjectDifferences from './getObjectDifferences'
import deleteKeys from './deleteKeys'

const { postgresUrl, mongoUrl } = config

chai.use(deepEqualInAnyOrder)
const { expect } = chai

export async function compareDataFromBothEnvs ({ endpoint, keysToSkip = {} }) {
  const postgresRes = (await axios.get(postgresUrl + endpoint)).data
  const mongoRes = (await axios.get(mongoUrl + endpoint)).data

  const { data: postgresData, pages: postgresPages } = postgresRes
  const { data: mongoData, pages: mongoPages } = mongoRes

  try {
    if (keysToSkip.data && keysToSkip.data.length) {
      deleteKeys(postgresData, mongoData, keysToSkip.data)
    }

    if (keysToSkip.pages && keysToSkip.pages.length) {
      deleteKeys(postgresPages, mongoPages, keysToSkip.pages)
    }

    expect(postgresRes).to.be.deep.equalInAnyOrder(mongoRes)
  } catch (e) {
    const dataDifferences = getObjectDifferences({ postgresObject: postgresData, mongoObject: mongoData })
    const pagesDifferences = getObjectDifferences({ postgresObject: postgresPages, mongoObject: mongoPages })
    console.dir({ dataDifferences, pagesDifferences }, { depth: null })
    throw new Error(`Results are not equal when testing endpoint ${endpoint}, see differences logged above`)
  }
}

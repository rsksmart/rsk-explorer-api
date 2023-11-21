import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import chai from 'chai'
import axios from 'axios'
import config from '../config/settings'
import getObjectDifferences from './getObjectDifferences'
import deleteKeys from './deleteKeys'

const { postgresUrl, mongoUrl } = config

chai.use(deepEqualInAnyOrder)
const { expect } = chai

export async function compareDataFromBothEnvs ({ endpoint, keysToSkip = {}, processData }) {
  const postgresRes = (await axios.get(postgresUrl + endpoint)).data
  const mongoRes = (await axios.get(mongoUrl + endpoint)).data

  if (processData) {
    const { processedPostgres, processedMongo } = processData(postgresRes.data, mongoRes.data)
    postgresRes.data = processedPostgres
    mongoRes.data = processedMongo
  }

  try {
    expect(postgresRes.data).to.not.equal(null, 'Postgres data is null')
    expect(mongoRes.data).to.not.equal(null, 'Mongo data is null')

    if (keysToSkip.data && keysToSkip.data.length) {
      deleteKeys(postgresRes.data, mongoRes.data, keysToSkip.data)
    }

    if (postgresRes.pages && mongoRes.pages && keysToSkip.pages && keysToSkip.pages.length) {
      deleteKeys(postgresRes.pages, mongoRes.pages, keysToSkip.pages)
    }

    if (keysToSkip.atRoot && keysToSkip.atRoot.length) {
      deleteKeys(postgresRes, mongoRes, keysToSkip.atRoot)
    }

    expect(postgresRes).to.be.deep.equalInAnyOrder(mongoRes)
  } catch (e) {
    if (e.message.includes('Postgres data is null') || e.message.includes('Mongo data is null')) {
      throw new Error(e)
    } else {
      const dataDifferences = getObjectDifferences({ postgresObject: postgresRes.data, mongoObject: mongoRes.data })
      const pagesDifferences = getObjectDifferences({ postgresObject: postgresRes.pages, mongoObject: mongoRes.pages })
      console.dir({ dataDifferences, pagesDifferences }, { depth: null })
      throw new Error(`Results are not equal when testing endpoint ${endpoint}, see differences logged above`)
    }
  }
}

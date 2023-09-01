import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import chai from 'chai'
import axios from 'axios'
import config from '../config/settings'
import getObjectDifferences from './getObjectDifferences'

const { postgresUrl, mongoUrl } = config

chai.use(deepEqualInAnyOrder)
const { expect } = chai

export async function compareDataFromBothEnvs (endpoint) {
  let postgresRes = (await axios.get(postgresUrl + endpoint)).data
  let mongoRes = (await axios.get(mongoUrl + endpoint)).data

  try {
    expect(postgresRes).to.be.deep.equalInAnyOrder(mongoRes)
  } catch (e) {
    const differences = getObjectDifferences({ postgresObject: postgresRes, mongoObject: mongoRes })
    console.dir({differences}, {depth: null})
    throw new Error(`Results are not equals when testing endpoint ${endpoint}, see differences logged above`)
  }
}

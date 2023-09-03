import { isEqual } from 'lodash'

export default function getObjectDifferences ({ postgresObject, mongoObject }) {
  const differences = {}

  if (postgresObject === null && mongoObject === null) {
    return {}
  } else if (postgresObject === null) {
    return { postgres: null, mongo: mongoObject }
  } else if (mongoObject === null) {
    return { postgres: postgresObject, mongo: null }
  }

  for (const key in postgresObject) {
    if (postgresObject.hasOwnProperty(key)) {
      if (Array.isArray(postgresObject[key]) && Array.isArray(mongoObject[key])) {
        // const sortedPostgres = [...postgresObject[key]].sort()
        // const sortedMongo = [...mongoObject[key]].sort()
        // if (!sortedPostgres.every((val, index) => val === sortedMongo[index])) {
        //   differences[key] = {
        //     postgres: postgresObject[key],
        //     mongo: mongoObject[key]
        //   }
        // }
        for (const pObject of postgresObject[key]) {
          if (!mongoObject[key].some(mObject => isEqual(pObject, mObject))) {
            differences.push({
              postgres: 'missing',
              mongo: mongoObject[key]
            })
          }
        }
      } else if (typeof postgresObject[key] === 'object' && typeof mongoObject[key] === 'object') {
        const nestedDiff = getObjectDifferences({
          postgresObject: postgresObject[key],
          mongoObject: mongoObject[key]
        })
        if (Object.keys(nestedDiff).length > 0) {
          differences[key] = nestedDiff
        }
      } else if (!mongoObject.hasOwnProperty(key)) {
        differences[key] = {
          postgres: postgresObject[key],
          mongo: 'missing'
        }
      } else if (postgresObject[key] !== mongoObject[key]) {
        differences[key] = {
          postgres: postgresObject[key],
          mongo: mongoObject[key]
        }
      }
    }
  }

  for (const key in mongoObject) {
    if (!postgresObject.hasOwnProperty(key)) {
      differences[key] = {
        postgres: 'missing',
        mongo: mongoObject[key]
      }
    }
  }

  return differences
}

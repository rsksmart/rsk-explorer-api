function isEqual (list1, list2) {
  list1 = JSON.stringify(list1)
  list2 = JSON.stringify(list2)

  return list1 === list2
}

export default function getObjectDifferences ({ postgresObject, mongoObject }) {
  const differences = {}

  if (postgresObject === null && mongoObject === null) {
    return {}
  } else if (postgresObject === null) {
    return { postgres: null, mongo: mongoObject }
  } else if (mongoObject === null) {
    return { postgres: postgresObject, mongo: null }
  }

  const areArrays = Array.isArray(postgresObject) && Array.isArray(mongoObject)
  const areObjects = !areArrays && typeof postgresObject === 'object' && typeof mongoObject === 'object'
  const areLeaves = !areArrays && !areObjects
  const isPrimitive = (type) => ['string', 'boolean', 'number'].includes(type)

  if (areLeaves) {
    if (postgresObject !== mongoObject) {
      return { postgres: postgresObject, mongo: mongoObject }
    } else {
      return {}
    }
  } else if (areObjects) {
    for (const key in postgresObject) {
      const nestedDiff = getObjectDifferences({
        postgresObject: postgresObject[key],
        mongoObject: mongoObject.hasOwnProperty(key) ? mongoObject[key] : 'Missing'
      })
      if (Object.keys(nestedDiff).length > 0) {
        differences[key] = nestedDiff
      }
    }

    for (const key in mongoObject) {
      const nestedDiff = getObjectDifferences({
        mongoObject: mongoObject[key],
        postgresObject: postgresObject.hasOwnProperty(key) ? postgresObject[key] : 'Missing'
      })

      if (Object.keys(nestedDiff).length > 0) {
        differences[key] = nestedDiff
      }
    }
  } else if (areArrays) {
    postgresObject.sort()
    mongoObject.sort()

    if (isPrimitive(typeof postgresObject[0]) || !postgresObject.length || !mongoObject.length) {
      if (!isEqual(postgresObject, mongoObject)) {
        return {
          postgres: postgresObject,
          mongo: mongoObject
        }
      } else {
        return {}
      }
    } else {
      for (const index in postgresObject) {
        const nestedDiff = getObjectDifferences({
          postgresObject: postgresObject[index],
          mongoObject: mongoObject[index] ? mongoObject[index] : 'Missing'
        })

        if (Object.keys(nestedDiff).length) {
          differences[index] = nestedDiff
        }
      }

      for (const index in mongoObject) {
        const nestedDiff = getObjectDifferences({
          mongoObject: mongoObject[index],
          postgresObject: postgresObject[index] ? postgresObject[index] : 'Missing'
        })

        if (Object.keys(nestedDiff).length) {
          differences[index] = nestedDiff
        }
      }
    }
  }

  return differences
}

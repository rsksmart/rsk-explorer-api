export function mongoSortToPrisma (num) {
  if (num === 1) {
    return 'asc'
  } else {
    return 'desc'
  }
}
// TODO: finish the mapping of the remaining mongo operators
export function mongoQueryToPrisma (query) {
  const mongoOperatorToPrisma = {
    $or: 'OR',
    $and: 'AND'
  }
  const newQuery = {}

  for (const key in query) {
    const value = query[key]
    if ((value && Object.keys(value).length > 0 && !Array.isArray(value))) {
      newQuery[mongoOperatorToPrisma[key] || key] = mongoQueryToPrisma(value)
    } else {
      newQuery[mongoOperatorToPrisma[key] || key] = value
    }
  }

  return newQuery
}

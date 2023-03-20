function mongoSortToPrisma (num) {
  if (num === 1) {
    return 'asc'
  } else {
    return 'desc'
  }
}

function createPrismaOrderBy (sortOrProject) {
  const sort = sortOrProject.sort || sortOrProject

  let orderBy = []
  if (sort) {
    orderBy = Object.entries(sort).map(([param, value]) => {
      const prismaValue = mongoSortToPrisma(value)
      if (param.charAt() === '_') {
        param = param.substring(1)
      }
      const prismaSort = {
        [param]: prismaValue
      }
      return prismaSort
    })
  }
  return orderBy
}

function createPrismaSelect (project) {
  let select = {}
  if (project.projection) {
    const listOfSelects = Object.keys(project.projection)
    for (const key of listOfSelects) {
      if (project.projection[key] === 1) {
        select[key] = true
      }
    }
  }
  return (Object.keys(select).length !== 0) ? select : null
}

// TODO: finish the mapping of the remaining mongo operators
function mongoQueryToPrisma (query) {
  const mongoOperatorToPrisma = {
    $or: 'OR',
    $and: 'AND',
    $lt: 'lt',
    $gt: 'gt',
    $eq: 'equals'
  }

  for (const key in query) {
    const value = query[key]

    if (Array.isArray(value)) {
      return {[mongoOperatorToPrisma[key] || key]: value.map(obj => mongoQueryToPrisma(obj))}
    } else if (!(typeof value === 'string') && Object.keys(value).length > 0) {
      return {
        [[mongoOperatorToPrisma[key] || key]]: mongoQueryToPrisma(value)
      }
    } else {
      if (key.includes('.')) {
        return formatRelationQuery({[key]: value})
      } else {
        return {
          [mongoOperatorToPrisma[key] || key]: value
        }
      }
    }
  }

  return {}
}

function formatRelationQuery (query) {
  const [relation, attribute] = Object.keys(query)[0].split('.')

  return {
    [relation]: {
      [attribute]: query[`${relation}.${attribute}`]
    }
  }
}

function removeNullFields (obj) {
  for (const key in obj) {
    if (Array.isArray(obj[key])) obj[key].forEach(arrValue => removeNullFields(arrValue))
    if (typeof (obj[key]) === 'object') removeNullFields(obj[key])
    if (obj[key] === null) delete obj[key]
  }
}

export {mongoSortToPrisma, createPrismaOrderBy, createPrismaSelect, mongoQueryToPrisma, removeNullFields}

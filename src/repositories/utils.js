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
  const select = project.projection || project
  const newSelect = {}

  for (const key of Object.keys(select)) {
    if (key !== 'sort' && select[key]) {
      newSelect[key] = true
    }
  }
  return newSelect
}

// TODO: finish the mapping of the remaining mongo operators
function mongoQueryToPrisma (query) {
  const mongoOperatorToPrisma = {
    $or: 'OR',
    $and: 'AND',
    $lt: 'lt',
    $gt: 'gt',
    $eq: 'equals',
    $in: 'in',
    $ne: 'not',
    $lte: 'lte',
    $gte: 'gte'
  }

  for (const key in query) {
    const value = query[key]

    if (Array.isArray(value)) {
      return {[mongoOperatorToPrisma[key] || key]: value.map(elem => ['Array', 'Object'].includes(elem.constructor.name) ? mongoQueryToPrisma(elem) : elem)}
    } else if (value && !(typeof value === 'string') && Object.keys(value).length > 0) {
      return {[mongoOperatorToPrisma[key] || key]: mongoQueryToPrisma(value)}
    } else {
      if (key === '$exists') {
        return value ? {not: null} : {equals: null}
      } else if (key.includes('.')) {
        return formatRelationQuery({[key]: value})
      } else {
        return {[mongoOperatorToPrisma[key] || key]: value}
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

function removeNullFields (obj, nullableFields = []) {
  if (typeof obj === 'string') {
    return obj
  } else {
    return Object.entries(obj).reduce((filtered, [key, value]) => {
      if (value !== undefined) {
        if (value !== null) {
          if (value.constructor.name === 'Array') {
            filtered[key] = value.map(v => removeNullFields(v))
          } else if (value.constructor.name === 'Object') {
            filtered[key] = removeNullFields(value)
          } else {
            filtered[key] = value
          }
        } else if (nullableFields.includes(key)) {
          filtered[key] = null
        }
      }

      return filtered
    }, {})
  }
}

function generateFindQuery (query, select, include, orderBy = {}, take) {
  query = mongoQueryToPrisma(query)
  select = createPrismaSelect(select)
  orderBy = createPrismaOrderBy(orderBy)

  const options = {
    where: mongoQueryToPrisma(query)
  }

  if (Object.keys(select).length) {
    options.select = select
  } else if (Object.keys(include).length) {
    options.include = include
  }

  if (Object.keys(orderBy).length) {
    options.orderBy = orderBy
  }

  if (take) {
    options.take = take
  }

  return options
}

export { removeNullFields, mongoQueryToPrisma, generateFindQuery }

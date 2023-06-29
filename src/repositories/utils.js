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
  select = createPrismaSelect(select)
  orderBy = createPrismaOrderBy(orderBy)

  const options = {
    where: query
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

export { removeNullFields, generateFindQuery }

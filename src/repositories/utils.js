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
    if (!['sort', 'undefined'].includes(key) && select[key]) {
      newSelect[key] = true
    }
  }
  return newSelect
}

function removeNullFields (obj, nullableFields = []) {
  for (const field in obj) {
    if ([undefined, null].includes(obj[field]) && !nullableFields.includes(field)) {
      delete obj[field]
    }
  }

  return obj
}

function generateFindQuery (query, select, include = {}, orderBy = {}, take) {
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

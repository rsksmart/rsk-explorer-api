function mongoSortToPrisma (num) {
  if (num === 1) {
    return 'asc'
  } else {
    return 'desc'
  }
}

function createPrismaOrderBy (project) {
  let orderBy = []
  if (project.sort) {
    orderBy = Object.entries(project.sort).map(([param, value]) => {
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

export {mongoSortToPrisma, createPrismaOrderBy, createPrismaSelect}

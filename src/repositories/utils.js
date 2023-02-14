export function mongoSortToPrisma (num) {
  if (num === 1) {
    return 'asc'
  } else {
    return 'desc'
  }
}

export const txPendingRepository = {
  async findOne (query = {}, options = {}, collection) {
    return collection.findOne(query, options)
  },
  async find (query = {}, options = {}, collection) {
    return collection.find(query, options)
  },
  async countDocuments (query = {}, collection) {
    return collection.countDocuments(query)
  },
  async aggregate (aggregate, collection) {
    return collection.aggregate(aggregate)
  }
}

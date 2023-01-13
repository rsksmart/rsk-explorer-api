export const internalTXRepository = {
  async findOne (query = {}, options = {}, collection) {
    return collection.findOne(query, options)
  },

  async aggregate (aggregate, collection) {
    return collection.aggregate(aggregate)
  },

  async find (query = {}, options = {}, collection) {
    return collection.find(query, options)
  },

  async countDocuments (query = {}, collection) {
    return collection.countDocuments(query)
  }
}

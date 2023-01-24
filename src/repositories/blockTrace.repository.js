export const blockTraceRepository = {
  async findOne (query = {}, options = {}, collection) {
    return collection.findOne(query, options)
  },
  async find (query = {}, options = {}, collection, sort = {}, limit = {}) {
    return collection
      .find(query, options)
      .sort(sort)
      .limit(limit)
      .toArray()
  },
  async countDocuments (query = {}, collection) {
    return collection.countDocuments(query)
  },
  async aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async insertOne (data, collection) {
    return collection.insertOne(data)
  }
}

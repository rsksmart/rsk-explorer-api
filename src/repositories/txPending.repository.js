export const txPendingRepository = {
  async findOne (query = {}, options = {}, collection) {
    return collection.findOne(query, options)
  },
  async find (query = {}, options = {}, collection, sort = {}, limit = {}, isArray = true) {
    if (isArray) {
      return collection
        .find(query, options)
        .sort(sort)
        .limit(limit)
        .toArray()
    } else {
      return collection
        .find(query, options)
        .sort(sort)
        .limit(limit)
    }
  },
  async countDocuments (query = {}, collection) {
    return collection.countDocuments(query)
  },
  async aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async deleteOne(query, collection) {
    return collection.deleteOne(query)
  },
  async updateOne (filter, update, options = {}, collection) {
    return collection.updateOne(filter, update, options)
  }
}

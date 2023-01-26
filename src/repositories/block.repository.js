export const blockRepository = {
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
  },
  async updateOne (filter, update, options = {}, collection) {
    return collection.updateOne(filter, update, options)
  },
  async deleteMany (filter, collection) {
    return collection.deleteMany(filter)
  }
}

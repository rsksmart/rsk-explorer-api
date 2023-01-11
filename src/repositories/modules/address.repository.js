export const addressRepository = {
  async findOne (query, options, collection) {
    return collection.findOne(query, options)
  }
}
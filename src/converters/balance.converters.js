function rawBalanceToEntity (data) {
  data.created = String(data._created)
  data.timestamp = String(data.timestamp)
  delete data._created
  return data
}

export { rawBalanceToEntity }

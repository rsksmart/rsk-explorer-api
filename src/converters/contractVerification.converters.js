function rawContractVerificationToEntity ({
  // handles both insertion and update, depending on the boolean as the second param
  _id,
  timestamp,
  request,
  error,
  result,
  match
}, updating) {
  if (updating) {
    return {
      error: JSON.stringify(error),
      result: JSON.stringify(result),
      match: JSON.stringify(match)
    }
  } else {
    return {
      _id,
      timestamp,
      request: JSON.stringify(request)
    }
  }
}

export {
  rawContractVerificationToEntity
}

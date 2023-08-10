function rawVerificationResultsToEntity ({
  _id,
  address,
  match,
  request,
  result,
  abi,
  sources,
  timestamp
}) {
  return {
    _id,
    address,
    match,
    request: JSON.stringify(request),
    result: JSON.stringify(result),
    abi: JSON.stringify(abi),
    sources: JSON.stringify(sources),
    timestamp
  }
}

function verificationResultsEntityToRaw ({
  _id,
  address,
  match,
  request,
  result,
  abi,
  sources,
  timestamp
}) {
  return {
    _id,
    address,
    match,
    request: JSON.parse(request),
    result: JSON.parse(result),
    abi: JSON.parse(abi),
    sources: JSON.parse(sources),
    timestamp
  }
}

export {
  verificationResultsEntityToRaw,
  rawVerificationResultsToEntity
}

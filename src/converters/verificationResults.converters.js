function rawVerificationResultsToEntity ({
  id,
  address,
  match,
  request,
  result,
  abi,
  sources,
  timestamp
}) {
  return {
    id,
    address,
    match,
    request: JSON.stringify(request),
    result: JSON.stringify(result),
    abi: JSON.stringify(abi),
    sources: JSON.stringify(sources),
    timestamp: String(timestamp)
  }
}

function verificationResultsEntityToRaw ({
  id,
  address,
  match,
  request,
  result,
  abi,
  sources,
  timestamp
}) {
  return {
    _id: id,
    address,
    match,
    request: JSON.parse(request),
    result: JSON.parse(result),
    abi: JSON.parse(abi),
    sources: JSON.parse(sources),
    timestamp: Number(timestamp)
  }
}

export {
  verificationResultsEntityToRaw,
  rawVerificationResultsToEntity
}

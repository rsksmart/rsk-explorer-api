function rawContractVerificationToEntity ({
  // handles both insertion and update, depending on the boolean as the second param
  id,
  timestamp,
  request,
  error,
  result,
  match
}, { updating } = {}) {
  if (updating) {
    return {
      error,
      result: JSON.stringify(result),
      match
    }
  } else {
    return {
      id,
      timestamp: String(timestamp),
      request: JSON.stringify(request)
    }
  }
}

function contractVerificationEntityToRaw ({
  id,
  address,
  error,
  match,
  request,
  result,
  timestamp
}) {
  const verificationToReturn = {
    id,
    request: JSON.parse(request),
    timestamp: Number(timestamp)
  }

  if (address) verificationToReturn.address = address
  if (error) verificationToReturn.error = error
  if (match) verificationToReturn.match = match
  if (result) verificationToReturn.result = JSON.parse(result)

  return verificationToReturn
}

export {
  rawContractVerificationToEntity,
  contractVerificationEntityToRaw
}

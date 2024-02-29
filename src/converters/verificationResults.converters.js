import { removeNullFields } from '../repositories/utils'

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
    timestamp
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
  const contractVerification = {
    _id: id,
    address,
    match,
    request,
    result,
    abi,
    sources,
    timestamp: Number(timestamp)
  }

  if (contractVerification.result) contractVerification.result = JSON.parse(result)
  if (contractVerification.abi) contractVerification.abi = JSON.parse(abi)
  if (contractVerification.sources) contractVerification.sources = JSON.parse(sources)
  if (contractVerification.request) {
    contractVerification.request = JSON.parse(request)
    delete contractVerification.request.id // extra id
  }

  return removeNullFields(contractVerification)
}

export {
  verificationResultsEntityToRaw,
  rawVerificationResultsToEntity
}

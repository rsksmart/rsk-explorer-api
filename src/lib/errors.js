export const apiError = (code, error) => {
  return { code, error }
}

export const apiErrors = (errors) => {
  const apiErrors = {}
  for (let e in errors) {
    apiErrors[e] = apiError(e, errors[e])
  }
  return apiErrors
}

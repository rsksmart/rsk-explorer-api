export async function retry ({ maxAttempts, isRetryable, run, doneByAnotherWriter = async () => false, beforeRetry = async () => {} }) {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await run()
    } catch (error) {
      if (!isRetryable(error)) throw error
      if (await doneByAnotherWriter(error)) return
      lastError = error
      if (attempt < maxAttempts) await beforeRetry(error, attempt)
    }
  }
  throw lastError
}

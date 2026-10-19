export async function withBoundedRetries ({ attempts, isRetryable, run, finishedElsewhere = async () => false, beforeRetry = async () => true }) {
  let lastRefusal
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run()
    } catch (error) {
      if (!isRetryable(error)) throw error
      if (await finishedElsewhere(error)) return
      lastRefusal = error
      if (attempt < attempts && !(await beforeRetry(error, attempt))) return
    }
  }
  throw lastRefusal
}

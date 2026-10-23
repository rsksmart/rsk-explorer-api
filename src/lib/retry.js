/**
 * Runs work again when it fails with an error the caller marks as retryable, up to maxAttempts calls in all.
 * @param {Object} options
 * @param {number} options.maxAttempts The most calls to run, the first one included; at least 1.
 * @param {function(Error): boolean} options.isRetryable Whether an error from run allows another attempt.
 * @param {function(): Promise<*>} options.run The work to run.
 * @param {function(Error): Promise<boolean>} [options.doneByAnotherWriter] Called after each retryable error; true stops without an error.
 * @param {function(Error, number): Promise<void>} [options.beforeRetry] Called with the error and the attempt number before the next attempt.
 * @returns {Promise<*>} What run returns, or undefined when doneByAnotherWriter returns true.
 * @throws {Error} An error isRetryable refuses, at once; the last retryable error, after maxAttempts calls.
 */
export async function retry ({
  maxAttempts,
  isRetryable,
  run,
  doneByAnotherWriter = async () => false,
  beforeRetry = async () => {}
}) {
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

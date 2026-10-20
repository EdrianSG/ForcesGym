// Share identical in-flight writes: double clicks should not create two records.
// This does not replace database idempotency across devices or after a lost response.
export function singleFlightWrite<Args extends unknown[], T>(write: (...args: Args) => Promise<T>) {
  const pending = new Map<string, Promise<T>>()
  return (...args: Args): Promise<T> => {
    const key = JSON.stringify(args)
    const existing = pending.get(key)
    if (existing) return existing
    const request = Promise.resolve().then(() => write(...args))
    pending.set(key, request)
    void request.finally(() => pending.delete(key)).catch(() => {})
    return request
  }
}

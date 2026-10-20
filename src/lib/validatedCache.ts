// Keep the last usable result while validating a lightweight database fingerprint.
export function createValidatedCache<T>(options: {
  fingerprint: () => Promise<string>
  load: () => Promise<T>
  maxAgeMs: number
}) {
  let value: T | null = null
  let fingerprint: string | null = null
  let checkedAt = 0
  let revision = 0
  let pending: Promise<T> | null = null
  const listeners = new Set<() => void>()
  return {
    peek: () => value,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    invalidate() {
      revision++
      pending = null
      checkedAt = 0
      fingerprint = null
      listeners.forEach((listener) => listener())
    },
    clear() {
      revision++
      value = null
      fingerprint = null
      checkedAt = 0
      pending = null
      listeners.forEach((listener) => listener())
    },
    get(force = false): Promise<T> {
      if (pending) return pending
      if (!force && value !== null && Date.now() - checkedAt < options.maxAgeMs) {
        return Promise.resolve(value)
      }
      const requestRevision = revision
      const request = (async () => {
        // On first load, validate and fetch in parallel to avoid an extra round trip.
        if (value === null) {
          const [nextFingerprint, result] = await Promise.all([options.fingerprint(), options.load()])
          if (requestRevision === revision) {
            value = result
            fingerprint = nextFingerprint
            checkedAt = Date.now()
          }
          return result
        }
        const nextFingerprint = await options.fingerprint()
        if (value !== null && fingerprint === nextFingerprint && requestRevision === revision) {
          checkedAt = Date.now()
          return value
        }
        const result = await options.load()
        if (requestRevision === revision) {
          value = result
          fingerprint = nextFingerprint
          checkedAt = Date.now()
        }
        return result
      })()
      pending = request
      void request.finally(() => { if (pending === request) pending = null }).catch(() => {})
      return request
    },
  }
}

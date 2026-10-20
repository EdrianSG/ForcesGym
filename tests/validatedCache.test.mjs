import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/validatedCache.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const exports = {}
new Function('exports', outputText)(exports)
const { createValidatedCache } = exports

function fixture(maxAgeMs = 30_000) {
  let version = 'one'
  let fail = false
  let loads = 0
  let checks = 0
  const cache = createValidatedCache({ maxAgeMs,
    fingerprint: async () => { checks++; if (fail) throw new Error('offline'); return version },
    load: async () => ({ load: ++loads }),
  })
  return { cache, change: () => { version = 'two' }, fail: () => { fail = true }, counts: () => ({ loads, checks }) }
}

test('reuses fresh dashboard without a network check and deduplicates simultaneous loads', async () => {
  const { cache, counts } = fixture()
  const [first, second] = await Promise.all([cache.get(), cache.get()])
  assert.equal(first, second)
  assert.equal(await cache.get(), first)
  assert.deepEqual(counts(), { checks: 1, loads: 1 })
})

test('unchanged fingerprint skips data downloads, changed fingerprint refreshes', async () => {
  const { cache, counts, change } = fixture(0)
  const first = await cache.get()
  assert.equal(await cache.get(), first)
  assert.deepEqual(counts(), { checks: 2, loads: 1 })
  change()
  assert.notEqual(await cache.get(), first)
  assert.deepEqual(counts(), { checks: 3, loads: 2 })
})

test('failed validation retains last dashboard and propagates error', async () => {
  const { cache, fail } = fixture(0)
  const first = await cache.get()
  fail()
  await assert.rejects(cache.get(), /offline/)
  assert.equal(cache.peek(), first)
})

test('local mutation forces refresh even during freshness period', async () => {
  const { cache, counts } = fixture()
  const first = await cache.get()
  cache.invalidate()
  assert.notEqual(await cache.get(), first)
  assert.deepEqual(counts(), { checks: 2, loads: 2 })
})

test('logout clears private data and prevents an old request from repopulating cache', async () => {
  let finish
  const cache = createValidatedCache({ maxAgeMs: 30_000,
    fingerprint: async () => 'one',
    load: () => new Promise((resolve) => { finish = resolve }),
  })
  const request = cache.get()
  cache.clear()
  finish({ private: true })
  await request
  assert.equal(cache.peek(), null)
})

test('mutation during load prevents publishing a stale result', async () => {
  let finish
  const cache = createValidatedCache({ maxAgeMs: 30_000,
    fingerprint: async () => 'one',
    load: () => new Promise((resolve) => { finish = resolve }),
  })
  const request = cache.get()
  cache.invalidate()
  finish({ old: true })
  await request
  assert.equal(cache.peek(), null)
})

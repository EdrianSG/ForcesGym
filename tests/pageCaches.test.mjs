import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function evaluate(path, dependencies = {}) {
  const source = readFileSync(new URL(`../src/${path}.ts`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const exports = {}
  new Function('require', 'exports', outputText)((id) => {
    if (!(id in dependencies)) throw new Error(`Unexpected import ${id}`)
    return dependencies[id]
  }, exports)
  return exports
}

function fixture() {
  const entries = new Map()
  let searches = 0
  let details = 0
  const request = { then: (resolve, reject) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve, reject) }
  for (const method of ['select', 'order', 'limit', 'eq', 'abortSignal']) request[method] = () => request
  const dependencies = {
    '@/lib/supabase': { supabase: { from: () => request } },
    '@/lib/validatedCache': evaluate('lib/validatedCache'),
    '@/lib/cacheRegistry': { registerCache(cache, tables) { entries.set(cache, tables); return () => entries.delete(cache) } },
    '@/services/membersService': {
      getMembers: async () => [], getMembershipNumbers: async () => ['1234'],
      searchMembers: async (query) => { searches++; return query === 'missing' ? [] : [{ id: query }] },
      getMemberById: async (id) => { details++; return { id } },
    },
    '@/services/plansService': { getPlans: async () => [] },
    '@/services/invoicesService': { getAllInvoices: async () => [], getInvoicesByMemberId: async () => [] },
    '@/services/subscriptionsService': { getSubscriptionsByMemberId: async () => [] },
  }
  return {
    api: evaluate('services/pageCaches', dependencies),
    invalidate(table) { for (const [cache, tables] of entries) if (tables.includes(table)) cache.invalidate() },
    counts: () => ({ searches, details }),
    registered: () => entries.size,
  }
}

test('search caches isolate queries and retain empty results', async () => {
  const { api, counts } = fixture()
  assert.deepEqual(await api.getSearchCache('missing').get(), [])
  assert.deepEqual(await api.getSearchCache('missing').get(), [])
  assert.deepEqual(await api.getSearchCache('1234').get(), [{ id: '1234' }])
  assert.deepEqual(counts(), { searches: 2, details: 0 })
})

test('editing a member invalidates related search and detail snapshots', async () => {
  const { api, counts, invalidate } = fixture()
  await api.getSearchCache('1234').get()
  await api.getMemberCache('1234').get()
  invalidate('members')
  await api.getSearchCache('1234').get()
  await api.getMemberCache('1234').get()
  assert.deepEqual(counts(), { searches: 2, details: 2 })
})

test('invoice writes do not invalidate unrelated member searches', async () => {
  const { api, counts, invalidate } = fixture()
  await api.getSearchCache('1234').get()
  await api.getMemberCache('1234').get()
  invalidate('invoices')
  await api.getSearchCache('1234').get()
  await api.getMemberCache('1234').get()
  assert.deepEqual(counts(), { searches: 1, details: 2 })
})

test('keyed caches have bounded registration and memory use', () => {
  const { api, registered } = fixture()
  for (let i = 0; i < 80; i++) api.getSearchCache(String(i))
  assert.equal(registered(), 54) // Four shared resources plus fifty search entries.
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function fixture() {
  let authChange
  const source = readFileSync(new URL('../src/lib/cacheRegistry.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const exports = {}
  new Function('require', 'exports', outputText)(() => ({ supabase: { auth: {
    onAuthStateChange(callback) { authChange = callback },
  } } }), exports)
  return { api: exports, authChange: (...args) => authChange(...args) }
}

test('writes invalidate only caches depending on changed tables', () => {
  const { api } = fixture()
  let members = 0
  let invoices = 0
  const unregister = api.registerCache({ invalidate() { members++ }, clear() {} }, ['members', 'subscriptions'])
  api.registerCache({ invalidate() { invoices++ }, clear() {} }, ['invoices'])
  api.invalidateData('subscriptions')
  assert.equal(members, 1)
  assert.equal(invoices, 0)
  unregister()
  api.invalidateData('members')
  assert.equal(members, 1)
})

test('changing users clears private snapshots outside the auth callback', async () => {
  const { api, authChange } = fixture()
  let cleared = 0
  api.registerCache({ invalidate() {}, clear() { cleared++ } }, ['members'])
  authChange('SIGNED_IN', { user: { id: 'first' } })
  assert.equal(cleared, 0)
  await Promise.resolve()
  assert.equal(cleared, 1)
  authChange('TOKEN_REFRESHED', { user: { id: 'first' } })
  await Promise.resolve()
  assert.equal(cleared, 1)
  authChange('SIGNED_OUT', null)
  await Promise.resolve()
  assert.equal(cleared, 2)
})

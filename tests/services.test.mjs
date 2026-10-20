import { createModuleLoader } from './helpers/loadModule.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Execute services with a local Supabase double: no credentials or remote writes.
function service(name, responses) {
  const calls = []
  const client = { from(table) {
    calls.push(['from', table])
    const request = {}
    for (const method of ['select', 'order', 'range', 'neq', 'eq', 'maybeSingle', 'limit', 'or', 'abortSignal', 'insert', 'update', 'single']) {
      request[method] = (...args) => { calls.push([method, ...args]); return request }
    }
    request.then = (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject)
    return request
  } }
  const source = readFileSync(new URL(`../src/services/${name}.ts`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const exports = {}
  const loadPure = createModuleLoader()
  const require = (id) => {
    if (id.startsWith('@/utils/') || ['@/lib/singleFlightWrite', '@/lib/registrationError'].includes(id)) return loadPure(id.slice(2))
    if (id === '@/lib/cacheRegistry') return { invalidateData() {} }
    if (id === '@/lib/supabase') return { supabase: client }
    if (id === '@/services/invoicesService') return { createAndUploadInvoice: async () => ({}) }
    if (id === 'jspdf') return {}
    throw new Error(`Unexpected dependency: ${id}`)
  }
  new Function('require', 'exports', outputText)(require, exports)
  return { api: exports, calls }
}

for (const [name, method] of [
  ['membersService', 'getMembers'],
  ['subscriptionsService', 'getSubscriptions'],
  ['plansService', 'getPlans'],
  ['invoicesService', 'getAllInvoices'],
  ['invoicesService', 'getInvoicesByMemberId'],
]) {
  test(`${method} distinguishes an empty response from a database failure`, async () => {
    const { api } = service(name, [
      { data: [], error: null },
      { data: null, error: { message: 'Connection failed' } },
    ])
    assert.deepEqual(await api[method](), [])
    await assert.rejects(api[method](), /Connection failed/)
  })
}

test('member history filters in Supabase before downloading rows', async () => {
  const { api, calls } = service('subscriptionsService', [{ data: [], error: null }])
  await api.getSubscriptionsByMemberId('member-123')
  assert.ok(calls.some(([method, field, value]) => method === 'eq' && field === 'member_id' && value === 'member-123'))
})

test('code loading retrieves later pages and excludes the current member', async () => {
  const { api, calls } = service('membersService', [
    { data: Array.from({ length: 1000 }, (_, i) => ({ membership_number: String(i) })), error: null },
    { data: [{ membership_number: 'last-code' }], error: null },
  ])
  const numbers = await api.getMembershipNumbers('current-member')
  assert.equal(numbers.length, 1001)
  assert.equal(numbers.at(-1), 'last-code')
  assert.deepEqual(calls.filter(([method]) => method === 'range'), [['range', 0, 999], ['range', 1000, 1999]])
  assert.equal(calls.filter(([method, field, value]) => method === 'neq' && field === 'id' && value === 'current-member').length, 2)
})

test('member detail distinguishes missing member from failure and filters by id', async () => {
  const { api, calls } = service('membersService', [
    { data: null, error: null },
    { data: null, error: { message: 'Offline' } },
  ])
  assert.equal(await api.getMemberById('missing'), null)
  await assert.rejects(api.getMemberById('missing'), /Offline/)
  assert.ok(calls.some(([method, field, value]) => method === 'eq' && field === 'id' && value === 'missing'))
})

const validRegistration = {
  membership_number: '1234', full_name: 'Ana Pérez', dni: '01234567', phone: '',
  plan_id: 'plan', start_date: '2026-10-20', end_date: '2026-11-19', price_paid: 80,
}

for (const [field, value] of [
  ['full_name', '   '], ['membership_number', '123'], ['dni', '1234abcd'],
  ['phone', 'llamar mañana'], ['price_paid', -1], ['price_paid', NaN],
  ['start_date', '2026-02-30'], ['end_date', '2026-01-01'], ['plan_id', ''],
]) {
  test(`invalid registration ${field}=${String(value)} makes no database writes`, async () => {
    const { api, calls } = service('membersService', [])
    await assert.rejects(api.createMemberWithSubscription({ ...validRegistration, [field]: value }))
    assert.equal(calls.length, 0)
  })
}

test('duplicate DNI or membership returns an actionable message', async () => {
  const { api } = service('membersService', [{ data: null, error: { code: '23505', message: 'duplicate key internal constraint' } }])
  await assert.rejects(api.createMemberWithSubscription(validRegistration), /Ya existe un cliente.*DNI/)
})

test('double submission saves one member and one subscription without a redundant read', async () => {
  const member = { ...validRegistration, id: 'saved-member' }
  const subscription = { id: 'saved-subscription', ...validRegistration }
  const { api, calls } = service('membersService', [
    { data: member, error: null }, { data: subscription, error: null },
  ])
  const [first, second] = await Promise.all([
    api.createMemberWithSubscription(validRegistration), api.createMemberWithSubscription(validRegistration),
  ])
  assert.equal(first.id, 'saved-member')
  assert.equal(first, second)
  assert.equal(calls.filter(([method]) => method === 'insert').length, 2)
  assert.deepEqual(calls.filter(([method]) => method === 'from'), [['from', 'members'], ['from', 'subscriptions']])
})

test('partial registration preserves the saved id and explicitly warns against another registration', async () => {
  const { api } = service('membersService', [
    { data: { id: 'saved-member', ...validRegistration }, error: null },
    { data: null, error: { message: 'offline' } },
  ])
  await assert.rejects(api.createMemberWithSubscription(validRegistration), (error) => {
    assert.equal(error.memberId, 'saved-member')
    assert.match(error.message, /No vuelvas a registrarlo/)
    return true
  })
})

for (const data of [
  { name: '   ', price: 80, duration_days: 30 },
  { name: 'Normal', price: -1, duration_days: 30 },
  { name: 'Normal', price: Infinity, duration_days: 30 },
  { name: 'Normal', price: 80.555, duration_days: 30 },
  { name: 'Normal', price: 80, duration_days: 1.5 },
  { name: 'Normal', price: 80, duration_days: 0 },
]) {
  test(`invalid plan ${JSON.stringify(data)} is rejected before writing`, async () => {
    const { api, calls } = service('plansService', [])
    await assert.rejects(api.createPlan(data))
    assert.equal(calls.length, 0)
  })
}

test('lost response during subscription insertion produces an incomplete-registration error', async () => {
  const { api } = service('membersService', [
    { data: { id: 'saved-member', ...validRegistration }, error: null },
    Promise.reject(new Error('Connection lost')),
  ])
  await assert.rejects(api.createMemberWithSubscription(validRegistration), (error) => error.memberId === 'saved-member')
})

test('double renewal creates one subscription and one invoice attempt', async () => {
  const { api, calls } = service('subscriptionsService', [{
    data: { ...validRegistration, id: 'sub', member_id: 'member', members: { full_name: 'Ana' }, membership_plans: { name: 'Normal' } }, error: null,
  }])
  const payload = { ...validRegistration, member_id: 'member' }
  const [first, second] = await Promise.all([api.renewSubscription(payload), api.renewSubscription(payload)])
  assert.equal(first, second)
  assert.equal(calls.filter(([method]) => method === 'insert').length, 1)
})

test('invalid edits are rejected without database calls', async () => {
  const members = service('membersService', [])
  await assert.rejects(members.api.updateMember('member', { full_name: '   ' }))
  await assert.rejects(members.api.updateMember('member', { dni: '123' }))
  assert.equal(members.calls.length, 0)
  const plans = service('plansService', [])
  await assert.rejects(plans.api.updatePlan('plan', { duration_days: -30 }))
  await assert.rejects(plans.api.updatePlan('plan', { price: NaN }))
  assert.equal(plans.calls.length, 0)
})

test('duplicate plan names give a clear correction message', async () => {
  const { api } = service('plansService', [{ data: null, error: { code: '23505', message: 'duplicate key' } }])
  await assert.rejects(api.createPlan({ name: 'Normal', price: 80, duration_days: 30 }), /Ya existe un plan con ese nombre/)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createModuleLoader } from './helpers/loadModule.mjs'
const load = createModuleLoader()
const { normalizeMember, validateDate } = load('utils/validation')
const { calculateEndDate, generateUniqueMembershipNumber } = load('utils/membership')
const { formatMoney } = load('utils/dates')
const { singleFlightWrite } = load('lib/singleFlightWrite')

test('pasted whitespace is normalized, accents and leading DNI zeros are preserved', () => {
  const input = { full_name: '  Ana   María O’Connor  ', dni: ' 01234567 ', membership_number: ' 1234 ', phone: ' +51 (999) 123-456 ' }
  assert.deepEqual(normalizeMember(input), { full_name: 'Ana María O’Connor', dni: '01234567', membership_number: '1234', phone: '+51999123456' })
  assert.equal(input.full_name, '  Ana   María O’Connor  ')
})

test('optional telephone accepts an empty value', () => {
  assert.deepEqual(normalizeMember({ phone: '   ' }), { phone: '' })
})

for (const value of ['', '2026-02-29', '2026-02-30', '2026-13-01', '2026-00-20', '20/10/2026']) {
  test(`invalid calendar date ${JSON.stringify(value)} is rejected`, () => assert.throws(() => validateDate(value)))
}

test('valid leap day is accepted', () => assert.doesNotThrow(() => validateDate('2028-02-29')))

for (const months of [0, -1, 1.5, 25, NaN, Infinity]) {
  test(`invalid months ${months} cannot generate an invoice preview`, () => {
    assert.throws(() => calculateEndDate('2026-10-20', 30, months))
  })
}

test('duration that exceeds Date limits is rejected rather than displaying NaN', () => {
  assert.throws(() => calculateEndDate('2026-10-20', Number.MAX_SAFE_INTEGER, 24))
})

test('exhausted membership codes do not return a duplicate 9999', () => {
  const codes = Array.from({ length: 9000 }, (_, index) => String(index + 1000))
  assert.equal(generateUniqueMembershipNumber(codes), '')
})

test('monetary display preserves cents instead of rounding the amount charged', () => {
  assert.match(formatMoney(80.25), /80[.,]25/)
})

test('double clicks share a single pending write', async () => {
  let writes = 0
  let finish
  const save = singleFlightWrite(() => { writes++; return new Promise((resolve) => { finish = resolve }) })
  const first = save('same')
  const second = save('same')
  assert.equal(first, second)
  await Promise.resolve()
  assert.equal(writes, 1)
  finish('saved')
  assert.deepEqual(await Promise.all([first, second]), ['saved', 'saved'])
})

test('a failed write releases the lock so the user can correct data and retry', async () => {
  let attempts = 0
  const save = singleFlightWrite(async () => {
    attempts++
    if (attempts === 1) throw new Error('offline')
    return 'saved'
  })
  await assert.rejects(save('same'), /offline/)
  assert.equal(await save('same'), 'saved')
})

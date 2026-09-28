import type { FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { createMemberWithSubscription, getMembers } from '@/services/membersService'
import { getPlans } from '@/services/plansService'
import type { MembershipPlan } from '@/types'
import { formatDate, formatMoney, todayISODate } from '@/utils/dates'
import {
  calculateEndDate,
  generateUniqueMembershipNumber,
  isMembershipNumberTaken,
} from '@/utils/membership'
import { cn } from '@/utils/cn'

const fieldClassName =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10'

const DURATION_PRESETS = [1, 2, 3, 6, 12] as const

export function MemberNewPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [existingNumbers, setExistingNumbers] = useState<string[]>([])
  const [planId, setPlanId] = useState('')
  const [startDate, setStartDate] = useState(todayISODate())
  const [months, setMonths] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getPlans().then((data) => setPlans(data))
    void getMembers().then((data) =>
      setExistingNumbers(data.map((m) => m.membership_number)),
    )
  }, [])

  const activePlans = useMemo(() => plans.filter((p) => p.active), [plans])

  const [membershipNumber, setMembershipNumber] = useState('')

  useEffect(() => {
    if (existingNumbers.length >= 0 && !membershipNumber) {
      setMembershipNumber(generateUniqueMembershipNumber(existingNumbers))
    }
  }, [existingNumbers, membershipNumber])

  const isTaken = useMemo(
    () => isMembershipNumberTaken(membershipNumber, existingNumbers),
    [membershipNumber, existingNumbers],
  )

  const selectedPlan = activePlans.find((plan) => plan.id === planId) ?? null

  const preview = useMemo(() => {
    if (!selectedPlan || !startDate || months < 1) {
      return null
    }

    return {
      endDate: calculateEndDate(startDate, selectedPlan.duration_days, months),
      totalDays: selectedPlan.duration_days * months,
      totalPrice: selectedPlan.price * months,
    }
  }, [months, selectedPlan, startDate])

  function handleGenerateCode() {
    setMembershipNumber(generateUniqueMembershipNumber(existingNumbers))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isTaken || !selectedPlan || !preview || saving) {
      return
    }

    setSaving(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const full_name = String(formData.get('full_name') ?? '').trim()
    const dni = String(formData.get('dni') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()

    try {
      const created = await createMemberWithSubscription({
        membership_number: membershipNumber.trim(),
        full_name,
        dni,
        phone,
        plan_id: selectedPlan.id,
        start_date: startDate,
        end_date: preview.endDate,
        price_paid: preview.totalPrice,
        plan_name: selectedPlan.name,
      })

      void navigate(`/members/${created.id}`)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al registrar el cliente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Nuevo cliente"
        description="Registra al cliente y define por cuánto tiempo inicia su membresía."
      />

      <Card className="mx-auto max-w-2xl p-6">
        <form className="space-y-8" onSubmit={handleSubmit}>
          <section>
            <h2 className="mb-4 text-sm font-semibold tracking-tight">
              Datos del cliente
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Número de membresía (4 dígitos)
                </span>
                <div className="flex gap-2">
                  <input
                    name="membership_number"
                    required
                    value={membershipNumber}
                    onChange={(event) => setMembershipNumber(event.target.value)}
                    placeholder="1915"
                    className={cn(
                      fieldClassName,
                      isTaken &&
                        'border-status-expired focus:border-status-expired focus:ring-status-expired/10',
                    )}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateCode}
                    title="Generar código automático no duplicado"
                    className="shrink-0"
                  >
                    <Sparkles className="size-4" />
                    Generar
                  </Button>
                </div>
                {isTaken ? (
                  <p className="mt-1.5 text-xs font-medium text-status-expired">
                    ⚠️ El código &quot;{membershipNumber.trim()}&quot; ya existe. Genera otro o escribe uno distinto.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">
                    Puedes escribirlo manualmente o presionar Generar.
                  </p>
                )}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">DNI</span>
                <input
                  name="dni"
                  required
                  placeholder="12345678"
                  className={fieldClassName}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">
                  Nombre completo
                </span>
                <input
                  name="full_name"
                  required
                  placeholder="Eduardo Sánchez"
                  className={fieldClassName}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">Teléfono</span>
                <input
                  name="phone"
                  placeholder="999999999"
                  className={fieldClassName}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold tracking-tight">
              Membresía inicial
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Plan</span>
                <select
                  name="plan_id"
                  required
                  value={planId}
                  onChange={(event) => setPlanId(event.target.value)}
                  className={fieldClassName}
                >
                  <option value="" disabled>
                    Selecciona un plan
                  </option>
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {formatMoney(plan.price)} / {plan.duration_days}{' '}
                      días
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Fecha de inicio
                </span>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={fieldClassName}
                />
              </label>

              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">
                  Duración
                </span>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMonths(preset)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                        months === preset
                          ? 'border-brand-dark bg-brand text-ink'
                          : 'border-line bg-surface text-ink hover:bg-canvas',
                      )}
                    >
                      {preset} {preset === 1 ? 'mes' : 'meses'}
                    </button>
                  ))}
                </div>
                <label className="mt-3 block max-w-40">
                  <span className="mb-1.5 block text-xs text-muted">
                    O escribe la cantidad de meses
                  </span>
                  <input
                    type="number"
                    name="months"
                    min={1}
                    max={24}
                    required
                    value={months}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setMonths(Number.isNaN(value) ? 1 : Math.min(24, Math.max(1, value)))
                    }}
                    className={fieldClassName}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-line bg-canvas/70 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  Vencimiento
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {preview ? formatDate(preview.endDate) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  Tiempo total
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {preview
                    ? `${months} ${months === 1 ? 'mes' : 'meses'} · ${preview.totalDays} días`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  Total a registrar
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {preview ? formatMoney(preview.totalPrice) : '—'}
                </p>
              </div>
            </div>
          </section>

          {error ? (
            <p className="text-sm text-status-expired font-medium">⚠️ {error}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving || isTaken}>
              {saving ? 'Guardando cliente…' : 'Guardar cliente'}
            </Button>
            <Link to="/members">
              <Button type="button" variant="secondary">Cancelar</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}

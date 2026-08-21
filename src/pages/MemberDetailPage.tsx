import type { FormEvent } from 'react'
import { Edit, FileText, RefreshCw, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { getInvoicesByMemberId } from '@/services/invoicesService'
import { getMemberById, getMembers, updateMember } from '@/services/membersService'
import { getPlans } from '@/services/plansService'
import {
  getSubscriptionsByMemberId,
  renewSubscription,
  type SubscriptionWithDetails,
} from '@/services/subscriptionsService'
import type { Invoice, MemberListItem, MembershipPlan } from '@/types'
import { formatDate, formatMoney, todayISODate } from '@/utils/dates'
import {
  calculateEndDate,
  generateUniqueMembershipNumber,
  getMembershipStatus,
  isMembershipNumberTaken,
} from '@/utils/membership'

const fieldClassName =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10'

const DURATION_PRESETS = [1, 2, 3, 6, 12] as const

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [member, setMember] = useState<MemberListItem | null>(null)
  const [history, setHistory] = useState<SubscriptionWithDetails[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)

  // Edit Form State
  const [editFullName, setEditFullName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editDni, setEditDni] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [existingNumbers, setExistingNumbers] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Renew Form State
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [startDate, setStartDate] = useState(todayISODate())
  const [months, setMonths] = useState(1)
  const [savingRenew, setSavingRenew] = useState(false)
  const [renewError, setRenewError] = useState<string | null>(null)

  function loadData() {
    if (!id) return
    setLoading(true)

    Promise.all([
      getMemberById(id),
      getSubscriptionsByMemberId(id),
      getPlans(),
      getMembers(),
      getInvoicesByMemberId(id),
    ]).then(([m, h, pList, mList, invList]) => {
      setMember(m)
      setHistory(h)
      setPlans(pList)
      setInvoices(invList)
      setExistingNumbers(
        mList.filter((item) => item.id !== id).map((item) => item.membership_number),
      )
      setLoading(false)

      if (m) {
        setEditFullName(m.full_name)
        setEditNumber(m.membership_number)
        setEditDni(m.dni)
        setEditPhone(m.phone)
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [id])

  const activePlans = useMemo(() => plans.filter((p) => p.active), [plans])
  const selectedPlan = activePlans.find((p) => p.id === selectedPlanId) ?? activePlans[0] ?? null

  const isCodeTaken = useMemo(
    () => isMembershipNumberTaken(editNumber, existingNumbers),
    [editNumber, existingNumbers],
  )

  const renewPreview = useMemo(() => {
    if (!selectedPlan || !startDate || months < 1) return null
    return {
      endDate: calculateEndDate(startDate, selectedPlan.duration_days, months),
      totalDays: selectedPlan.duration_days * months,
      totalPrice: selectedPlan.price * months,
    }
  }, [months, selectedPlan, startDate])

  function handleOpenRenew() {
    if (member?.current_end_date) {
      // Suggest day after current end date if valid
      try {
        const nextDay = new Date(member.current_end_date)
        nextDay.setDate(nextDay.getDate() + 1)
        const iso = nextDay.toISOString().split('T')[0]
        if (iso && iso > todayISODate()) {
          setStartDate(iso)
        } else {
          setStartDate(todayISODate())
        }
      } catch {
        setStartDate(todayISODate())
      }
    } else {
      setStartDate(todayISODate())
    }
    if (activePlans[0]) {
      setSelectedPlanId(activePlans[0].id)
    }
    setShowRenewModal(true)
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!member || isCodeTaken || savingEdit) return

    setSavingEdit(true)
    setEditError(null)

    try {
      await updateMember(member.id, {
        full_name: editFullName.trim(),
        membership_number: editNumber.trim(),
        dni: editDni.trim(),
        phone: editPhone.trim(),
      })
      setShowEditModal(false)
      loadData()
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar el cliente.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSaveRenew(e: FormEvent) {
    e.preventDefault()
    if (!member || !selectedPlan || !renewPreview || savingRenew) return

    setSavingRenew(true)
    setRenewError(null)

    try {
      await renewSubscription({
        member_id: member.id,
        plan_id: selectedPlan.id,
        start_date: startDate,
        end_date: renewPreview.endDate,
        price_paid: renewPreview.totalPrice,
        plan_name: selectedPlan.name,
        member_name: member.full_name,
      })
      setShowRenewModal(false)
      loadData()
    } catch (err: unknown) {
      setRenewError(err instanceof Error ? err.message : 'Error al renovar la membresía.')
    } finally {
      setSavingRenew(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Cargando cliente…" />
        <Card className="p-8 text-center text-muted">
          Obteniendo información del cliente…
        </Card>
      </div>
    )
  }

  if (!member) {
    return (
      <div>
        <PageHeader title="Cliente no encontrado" />
        <Link to="/members" className="text-sm font-medium hover:underline">
          Volver a clientes
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={member.full_name}
        description={`Membresía #${member.membership_number}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Edit className="size-4" />
              Editar datos
            </Button>
            <Button onClick={handleOpenRenew}>
              <RefreshCw className="size-4" />
              Renovar membresía
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-sm font-semibold tracking-tight">Información del cliente</h2>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="text-xs font-medium text-ink underline-offset-4 hover:underline flex items-center gap-1"
            >
              <Edit className="size-3.5" /> Editar
            </button>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                Número de membresía
              </dt>
              <dd className="mt-1 font-mono text-lg font-semibold">
                #{member.membership_number}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                Estado actual
              </dt>
              <dd className="mt-1">
                <StatusBadge status={getMembershipStatus(member.current_end_date)} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                DNI
              </dt>
              <dd className="mt-1 text-sm">{member.dni}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                Teléfono
              </dt>
              <dd className="mt-1 text-sm">{member.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                Plan actual
              </dt>
              <dd className="mt-1 text-sm font-medium">{member.current_plan_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                Inicio
              </dt>
              <dd className="mt-1 text-sm">
                {member.current_start_date ? formatDate(member.current_start_date) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                Vencimiento
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {member.current_end_date ? formatDate(member.current_end_date) : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Historial de membresías</h2>
            <button
              type="button"
              onClick={handleOpenRenew}
              className="text-xs font-medium text-ink underline-offset-4 hover:underline"
            >
              + Nueva
            </button>
          </div>
          {history.length === 0 ? (
            <p className="p-5 text-sm text-muted">Sin historial de pagos.</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((subscription) => (
                <li key={subscription.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{subscription.plan_name}</p>
                    <p className="text-sm font-semibold text-ink">
                      {formatMoney(subscription.price_paid)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Desde: {formatDate(subscription.start_date)} hasta{' '}
                    {formatDate(subscription.end_date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Sección de Boletas y Comprobantes SUNAT (Almacenados en Supabase Storage) */}
      <Card className="mt-4">
        <div className="border-b border-line px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="size-4 text-emerald-600" />
            Boletas Electrónicas SUNAT (Guardadas en Supabase Storage)
          </h2>
        </div>
        {invoices.length === 0 ? (
          <p className="p-5 text-sm text-muted">
            No hay boletas emitidas aún para este cliente. Se generará una automáticamente en su próxima renovación o registro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/70 text-xs font-medium text-muted uppercase">
                <tr>
                  <th className="px-5 py-3">N° Comprobante</th>
                  <th className="px-5 py-3">Cód. Socio</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Subtotal</th>
                  <th className="px-5 py-3">IGV (18%)</th>
                  <th className="px-5 py-3">Total (S/.)</th>
                  <th className="px-5 py-3 text-right">Archivo PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-canvas/60">
                    <td className="px-5 py-3 font-semibold text-ink">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">
                      #{inv.client_code}
                    </td>
                    <td className="px-5 py-3 text-muted">{inv.plan_name}</td>
                    <td className="px-5 py-3 text-muted">{formatMoney(inv.subtotal)}</td>
                    <td className="px-5 py-3 text-muted">{formatMoney(inv.igv)}</td>
                    <td className="px-5 py-3 font-semibold text-ink">
                      {formatMoney(inv.total)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          <FileText className="size-3.5" />
                          Ver PDF (Storage)
                        </a>
                      ) : (
                        <span className="text-xs text-muted">Sin PDF</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Editar Cliente */}
      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <h3 className="text-base font-semibold">Editar cliente</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <span className="mb-1.5 block text-sm font-medium">
                  Número de membresía (4 dígitos)
                </span>
                <div className="flex gap-2">
                  <input
                    required
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    className={fieldClassName}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setEditNumber(generateUniqueMembershipNumber(existingNumbers))
                    }
                    className="shrink-0"
                  >
                    <Sparkles className="size-4" />
                  </Button>
                </div>
                {isCodeTaken ? (
                  <p className="mt-1 text-xs text-status-expired font-medium">
                    ⚠️ El código &quot;{editNumber}&quot; ya pertenece a otro socio.
                  </p>
                ) : null}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Nombre completo</span>
                <input
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className={fieldClassName}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">DNI</span>
                <input
                  required
                  value={editDni}
                  onChange={(e) => setEditDni(e.target.value)}
                  className={fieldClassName}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Teléfono</span>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={fieldClassName}
                />
              </label>

              {editError ? (
                <p className="text-xs font-medium text-status-expired">⚠️ {editError}</p>
              ) : null}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={savingEdit || isCodeTaken} className="flex-1">
                  {savingEdit ? 'Guardando…' : 'Guardar cambios'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {/* Modal Renovar Membresía */}
      {showRenewModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div>
                <h3 className="text-base font-semibold">Renovar membresía</h3>
                <p className="text-xs text-muted">{member.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenew} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Selecciona un Plan</span>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className={fieldClassName}
                >
                  {activePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatMoney(p.price)} / mes
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Fecha de inicio</span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={fieldClassName}
                />
              </label>

              <div>
                <span className="mb-1.5 block text-sm font-medium">Duración</span>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMonths(preset)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        months === preset
                          ? 'border-ink bg-ink text-white'
                          : 'border-line bg-surface text-ink hover:bg-canvas'
                      }`}
                    >
                      {preset} {preset === 1 ? 'mes' : 'meses'}
                    </button>
                  ))}
                </div>
              </div>

              {renewPreview ? (
                <div className="rounded-xl border border-line bg-canvas/60 p-3.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Nueva fecha de vencimiento:</span>
                    <span className="font-semibold text-ink">{formatDate(renewPreview.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Monto total a cobrar:</span>
                    <span className="font-bold text-ink text-sm">{formatMoney(renewPreview.totalPrice)}</span>
                  </div>
                </div>
              ) : null}

              {renewError ? (
                <p className="text-xs font-medium text-status-expired">⚠️ {renewError}</p>
              ) : null}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={savingRenew} className="flex-1">
                  {savingRenew ? 'Registrando…' : 'Registrar renovación'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRenewModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

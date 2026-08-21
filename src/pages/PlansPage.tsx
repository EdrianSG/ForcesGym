import type { FormEvent } from 'react'
import { Edit, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { getPlans, togglePlanActive, updatePlan } from '@/services/plansService'
import type { MembershipPlan } from '@/types'
import { formatMoney } from '@/utils/dates'
import { cn } from '@/utils/cn'

export function PlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getPlans().then((data) => {
      if (active) {
        setPlans(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handleTogglePlan(id: string, currentActive: boolean) {
    await togglePlanActive(id, !currentActive)
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !currentActive } : p)),
    )
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingPlan) return

    setSaving(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const price = Number(formData.get('price'))
    const duration_days = Number(formData.get('duration_days'))

    try {
      await updatePlan(editingPlan.id, { name, price, duration_days })
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id ? { ...p, name, price, duration_days } : p,
        ),
      )
      setEditingPlan(null)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al actualizar el plan.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Planes de Membresía"
        description="Gestiona los planes disponibles y modifica sus precios en tiempo real."
        actions={
          <Button disabled title="Próximamente">
            <Plus className="size-4" />
            Nuevo plan
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-xs font-medium tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Precio (S/.)</th>
                <th className="px-4 py-3">Duración</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    Cargando catálogo de planes…
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3 font-medium text-ink">{plan.name}</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {formatMoney(plan.price)}
                    </td>
                    <td className="px-4 py-3 text-muted">{plan.duration_days} días</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          plan.active
                            ? 'bg-status-active-bg text-status-active'
                            : 'bg-canvas text-muted',
                        )}
                      >
                        {plan.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingPlan(plan)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-ink underline-offset-4 hover:underline"
                        >
                          <Edit className="size-3.5" />
                          Editar precio
                        </button>
                        <span className="text-line">|</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePlan(plan.id, plan.active)}
                          className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
                        >
                          {plan.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de edición de precio y plan */}
      {editingPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-semibold text-ink">
                Editar Plan — {editingPlan.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Nombre del Plan
                </span>
                <input
                  name="name"
                  defaultValue={editingPlan.name}
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Precio (S/.)
                </span>
                <input
                  type="number"
                  name="price"
                  step="0.5"
                  min="0"
                  defaultValue={editingPlan.price}
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink font-semibold outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Duración (Días)
                </span>
                <input
                  type="number"
                  name="duration_days"
                  min="1"
                  defaultValue={editingPlan.duration_days}
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              {error ? (
                <p className="text-sm font-medium text-status-expired">{error}</p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingPlan(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

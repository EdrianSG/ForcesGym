import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { getPlans, togglePlanActive } from '@/services/plansService'
import type { MembershipPlan } from '@/types'
import { formatMoney } from '@/utils/dates'
import { cn } from '@/utils/cn'

export function PlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div>
      <PageHeader
        title="Planes"
        description="Planes disponibles para nuevas membresías y renovaciones."
        actions={
          <Button>
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
                <th className="px-4 py-3">Precio</th>
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
                    <td className="px-4 py-3 font-medium">{plan.name}</td>
                    <td className="px-4 py-3">{formatMoney(plan.price)}</td>
                    <td className="px-4 py-3">{plan.duration_days} días</td>
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
                      <button
                        type="button"
                        onClick={() => handleTogglePlan(plan.id, plan.active)}
                        className="text-xs font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {plan.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

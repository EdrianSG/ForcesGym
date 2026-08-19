import { AlertTriangle, Clock3, UserRound, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { DemoNotice } from '@/components/ui/DemoNotice'
import { PageHeader } from '@/components/ui/PageHeader'
import { getMembers } from '@/services/membersService'
import {
  getSubscriptions,
  type SubscriptionWithDetails,
} from '@/services/subscriptionsService'
import type { MemberListItem } from '@/types'
import { formatDate, formatMoney } from '@/utils/dates'
import { getMembershipStatus } from '@/utils/membership'

export function DashboardPage() {
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionWithDetails[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([getMembers(), getSubscriptions()]).then(([mList, sList]) => {
      if (active) {
        setMembers(mList)
        setSubscriptions(sList)
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(
    () => [
      {
        label: 'Clientes registrados',
        value: members.length,
        icon: Users,
      },
      {
        label: 'Membresías activas',
        value: members.filter(
          (m) => getMembershipStatus(m.current_end_date) === 'ACTIVO',
        ).length,
        icon: UserRound,
      },
      {
        label: 'Membresías vencidas',
        value: members.filter(
          (m) => getMembershipStatus(m.current_end_date) === 'VENCIDO',
        ).length,
        icon: AlertTriangle,
      },
      {
        label: 'Vencen próximamente',
        value: members.filter(
          (m) =>
            getMembershipStatus(m.current_end_date) === 'PRÓXIMO A VENCER',
        ).length,
        icon: Clock3,
      },
    ],
    [members],
  )

  const latestRenewals = useMemo(
    () =>
      [...subscriptions]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5),
    [subscriptions],
  )

  const expiringSoon = useMemo(
    () =>
      members.filter(
        (m) => getMembershipStatus(m.current_end_date) === 'PRÓXIMO A VENCER',
      ),
    [members],
  )
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen operativo del gimnasio."
      />
      <DemoNotice />

      {loading ? (
        <Card className="p-8 text-center text-muted">
          Cargando datos del dashboard…
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted">{label}</p>
                  <Icon className="size-4 text-muted" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
                </Card>
            ))}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-sm font-semibold">Últimas renovaciones</h2>
              </div>
              <ul className="divide-y divide-line">
                {latestRenewals.map((subscription) => (
                  <li
                    key={subscription.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {subscription.member_name}
                      </p>
                      <p className="text-xs text-muted">
                        {subscription.plan_name} · {formatDate(subscription.start_date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {formatMoney(subscription.price_paid)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="lg:col-span-2">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-sm font-semibold">Clientes próximos a vencer</h2>
              </div>
              {expiringSoon.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted">
                  No hay vencimientos próximos.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {expiringSoon.map((member) => (
                    <li key={member.id}>
                      <Link
                        to={`/members/${member.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-canvas/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {member.full_name}
                          </p>
                          <p className="font-mono text-xs text-muted">
                            #{member.membership_number}
                          </p>
                        </div>
                        <StatusBadge
                          status={getMembershipStatus(member.current_end_date)}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

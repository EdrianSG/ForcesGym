import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { getMembers } from '@/services/membersService'
import type { MemberListItem } from '@/types'
import { formatDate } from '@/utils/dates'
import { getMembershipStatus } from '@/utils/membership'

export function MembershipsPage() {
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getMembers().then((data) => {
      if (active) {
        setMembers(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Membresías"
        description="Vista rápida del estado actual de cada cliente."
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-center text-sm">
            <thead className="border-b border-line bg-canvas/70 text-xs font-medium tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Membresía</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-muted">
                    Cargando membresías…
                  </td>
                </tr>
              ) : members.map((member) => (
                <tr key={member.id} className="hover:bg-canvas/60">
                  <td className="px-4 py-3 font-mono font-semibold">
                    #{member.membership_number}
                  </td>
                  <td className="px-4 py-3 font-medium">{member.full_name}</td>
                  <td className="px-4 py-3">{member.current_plan_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {member.current_end_date
                      ? formatDate(member.current_end_date)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <StatusBadge
                        status={getMembershipStatus(member.current_end_date)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/members/${member.id}`}
                      className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                    >
                      Editar / Renovar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

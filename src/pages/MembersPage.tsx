import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { getMembers } from '@/services/membersService'
import type { MemberListItem } from '@/types'
import { formatDate } from '@/utils/dates'
import { getMembershipStatus } from '@/utils/membership'

export function MembersPage() {
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    void getMembers(query).then((data) => {
      if (active) {
        setMembers(data)
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [query])

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Busca por membresía, nombre, DNI o teléfono."
        actions={
          <Link to="/members/new">
            <Button>
              <Plus className="size-4" />
              Nuevo cliente
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line p-3 sm:p-4">
          <label className="relative mx-auto block max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por 1915, nombre, DNI o teléfono"
              className="w-full rounded-lg border border-line bg-canvas/60 py-2.5 pr-3 pl-10 text-sm outline-none placeholder:text-muted focus:border-ink focus:bg-surface focus:ring-2 focus:ring-ink/10"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-center text-sm">
            <thead className="border-b border-line bg-canvas/70 text-xs font-medium tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Membresía</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Plan actual</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-muted">
                    Cargando clientes…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-muted">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-canvas px-2 py-1 font-mono text-sm font-semibold tracking-wide">
                        {member.membership_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{member.full_name}</td>
                    <td className="px-4 py-3 text-muted">{member.dni}</td>
                    <td className="px-4 py-3 text-muted">{member.phone}</td>
                    <td className="px-4 py-3">{member.current_plan_name}</td>
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
                        Ver / Editar
                      </Link>
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

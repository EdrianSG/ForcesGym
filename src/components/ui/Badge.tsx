import type { MembershipStatus } from '@/types'
import { cn } from '@/utils/cn'

const styles: Record<MembershipStatus, string> = {
  ACTIVO: 'bg-status-active-bg text-status-active',
  VENCIDO: 'bg-status-expired-bg text-status-expired',
  'PRÓXIMO A VENCER': 'bg-status-soon-bg text-status-soon',
}

interface StatusBadgeProps {
  status: MembershipStatus | null
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) {
    return <span className="text-sm text-muted">Sin membresía</span>
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        styles[status],
      )}
    >
      {status}
    </span>
  )
}

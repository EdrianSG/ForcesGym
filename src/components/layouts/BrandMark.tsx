import { Dumbbell } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BrandMarkProps {
  inverted?: boolean
}

export function BrandMark({ inverted = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-lg',
          inverted ? 'bg-ink text-white' : 'bg-white/10 text-white',
        )}
      >
        <Dumbbell className="size-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-semibold tracking-tight',
            inverted ? 'text-ink' : 'text-white',
          )}
        >
          ForcesGym
        </p>
        <p
          className={cn(
            'text-[11px] leading-none',
            inverted ? 'text-muted' : 'text-sidebar-muted',
          )}
        >
          Administración
        </p>
      </div>
    </div>
  )
}

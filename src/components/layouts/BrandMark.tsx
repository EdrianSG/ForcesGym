import { cn } from '@/utils/cn'

interface BrandMarkProps {
  inverted?: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

const logoSizes = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-28',
} as const

export function BrandMark({
  inverted = false,
  size = 'sm',
  showText = true,
}: BrandMarkProps) {
  return (
    <div className={cn('flex items-center', showText ? 'gap-2.5' : 'justify-center')}>
      <img
        src="/logo.png"
        alt="Forces Gym"
        className={cn(
          'shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/10',
          logoSizes[size],
        )}
      />
      {showText ? (
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-semibold tracking-tight',
              inverted ? 'text-ink' : 'text-white',
            )}
          >
            Forces Gym
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
      ) : null}
    </div>
  )
}

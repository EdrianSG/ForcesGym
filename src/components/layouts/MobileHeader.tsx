import { Menu } from 'lucide-react'
import { BrandMark } from '@/components/layouts/BrandMark'

interface MobileHeaderProps {
  onOpenMenu: () => void
}

export function MobileHeader({ onOpenMenu }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line border-t-2 border-t-brand bg-surface px-4 py-3 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-lg p-1.5 text-ink hover:bg-canvas"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>
      <BrandMark inverted size="sm" />
    </header>
  )
}

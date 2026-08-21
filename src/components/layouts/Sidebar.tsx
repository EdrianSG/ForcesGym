import { CreditCard, FileText, IdCard, LayoutDashboard, LogOut, Users, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { BrandMark } from '@/components/layouts/BrandMark'
import { useSupabaseStatus } from '@/hooks/useSupabaseStatus'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Clientes', icon: Users },
  { to: '/memberships', label: 'Membresías', icon: IdCard },
  { to: '/plans', label: 'Planes', icon: CreditCard },
  { to: '/invoices', label: 'Facturación SUNAT', icon: FileText },
] as const

interface SidebarProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
}

export function Sidebar({ open, onClose, onLogout }: SidebarProps) {
  const status = useSupabaseStatus()
  const isOnline = status.state === 'ok'
  const isChecking = status.state === 'checking'

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar menú"
        className={cn(
          'fixed inset-0 z-30 bg-ink/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-white transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <BrandMark />
          <button
            type="button"
            className="rounded-md p-1 text-sidebar-muted hover:bg-sidebar-hover hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/8 p-4">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                AD
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Administrador</p>
                <p className="truncate text-xs text-sidebar-muted">
                  admin@forcesgym.com
                </p>
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
            <span
              className={cn(
                'size-2 rounded-full shrink-0',
                isChecking
                  ? 'bg-amber-400 animate-pulse'
                  : isOnline
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : 'bg-zinc-500',
              )}
            />
            <span className="text-sidebar-muted font-medium">
              {isChecking ? 'Comprobando…' : isOnline ? 'En línea' : 'Sin conexión'}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}

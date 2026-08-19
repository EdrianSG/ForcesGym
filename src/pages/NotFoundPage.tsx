import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-canvas px-4 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-2 text-xl font-semibold">Página no encontrada</h1>
      <p className="mt-1 text-sm text-muted">
        La ruta no existe o todavía no está implementada.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>Ir al dashboard</Button>
      </Link>
    </div>
  )
}

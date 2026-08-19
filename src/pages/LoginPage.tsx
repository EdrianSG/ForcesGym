import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/layouts/BrandMark'
import { Button } from '@/components/ui/Button'
import { SupabaseStatus } from '@/components/ui/SupabaseStatus'
import { DEMO_ADMIN } from '@/data/demoAuth'
import { login } from '@/services/authService'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(email, password)
      if (result.error) {
        setError(result.error)
      } else {
        void navigate('/dashboard')
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error inesperado al iniciar sesión.',
      )
    } finally {
      setLoading(false)
    }
  }

  function fillDemoCredentials() {
    setEmail(DEMO_ADMIN.email)
    setPassword(DEMO_ADMIN.password)
    setError(null)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <BrandMark inverted />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-8 shadow-card">
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-muted">
            Acceso para personal administrativo.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Correo electrónico
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@forcesgym.local"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </label>

            {error ? <p className="text-sm text-status-expired">{error}</p> : null}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <p className="font-medium text-ink">Acceso de demostración</p>
          <p className="mt-1 text-muted">
            Correo: <span className="font-medium text-ink">{DEMO_ADMIN.email}</span>
          </p>
          <p className="text-muted">
            Contraseña:{' '}
            <span className="font-medium text-ink">{DEMO_ADMIN.password}</span>
          </p>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="mt-2 text-sm font-medium text-ink underline-offset-4 hover:underline"
          >
            Usar estas credenciales
          </button>
        </div>

        <SupabaseStatus className="mt-4" />
      </div>
    </div>
  )
}

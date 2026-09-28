import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/layouts/BrandMark'
import { Button } from '@/components/ui/Button'
import { useSupabaseStatus } from '@/hooks/useSupabaseStatus'
import { login } from '@/services/authService'
import { cn } from '@/utils/cn'

export function LoginPage() {
  const navigate = useNavigate()
  const status = useSupabaseStatus()
  const isOnline = status.state === 'ok'
  const isChecking = status.state === 'checking'

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

  return (
    <div className="flex min-h-svh items-center justify-center bg-[linear-gradient(180deg,#1B1B1B_0%,#000000_45%,#1B1B1B_100%)] px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandMark size="lg" showText={false} />
          <div className="text-center">
            <p className="text-lg font-semibold tracking-tight text-brand">
              Forces Gym
            </p>
            <p className="text-sm text-white/60">Panel administrativo</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface p-8 shadow-card">
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
                placeholder="admin@forcesgym.com"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/30"
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
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>

            {error ? <p className="text-sm text-status-expired">{error}</p> : null}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/55">
          <span
            className={cn(
              'size-2 rounded-full',
              isChecking
                ? 'bg-brand animate-pulse'
                : isOnline
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                  : 'bg-zinc-500',
            )}
          />
          <span>
            {isChecking ? 'Comprobando…' : isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
      </div>
    </div>
  )
}

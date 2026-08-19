import { supabase } from '@/lib/supabase'
import { isSupabaseConfigured } from '@/lib/env'
import { DEMO_ADMIN } from '@/data/demoAuth'
import type { Profile } from '@/types'

export async function login(email: string, pass: string) {
  if (!isSupabaseConfigured() || !supabase) {
    if (
      email.trim().toLowerCase() === DEMO_ADMIN.email &&
      pass === DEMO_ADMIN.password
    ) {
      return {
        user: { id: 'demo-admin-id', email: DEMO_ADMIN.email },
        profile: {
          id: 'demo-admin-id',
          full_name: DEMO_ADMIN.fullName,
          role: 'admin',
          created_at: new Date().toISOString(),
        } as Profile,
        error: null,
      }
    }
    return {
      user: null,
      profile: null,
      error:
        'Supabase no está configurado en este entorno. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.',
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  })

  if (error || !data.user) {
    if (
      email.trim().toLowerCase() === DEMO_ADMIN.email &&
      pass === DEMO_ADMIN.password
    ) {
      return {
        user: { id: 'demo-admin-id', email: DEMO_ADMIN.email },
        profile: {
          id: 'demo-admin-id',
          full_name: DEMO_ADMIN.fullName,
          role: 'admin',
          created_at: new Date().toISOString(),
        } as Profile,
        error: null,
      }
    }

    return {
      user: null,
      profile: null,
      error:
        error?.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos en Supabase.'
          : error?.message || 'Error al iniciar sesión en Supabase.',
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return { user: data.user, profile: profile as Profile | null, error: null }
}

export async function logout() {
  if (isSupabaseConfigured() && supabase) {
    await supabase.auth.signOut()
  }
}

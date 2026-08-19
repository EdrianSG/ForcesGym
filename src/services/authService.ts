import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function login(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  })

  if (error || !data.user) {
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
  await supabase.auth.signOut()
}

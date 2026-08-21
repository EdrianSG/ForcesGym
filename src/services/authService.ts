import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function login(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  })

  if (error || !data.user) {
    const rawMsg = error?.message || ''
    let userMsg = 'Error al iniciar sesión en Supabase.'

    if (rawMsg === 'Invalid login credentials') {
      userMsg = 'Correo o contraseña incorrectos en Supabase.'
    } else if (rawMsg === 'Failed to fetch' || rawMsg.includes('fetch')) {
      userMsg =
        'No se pudo contactar con Supabase (Failed to fetch). Verifica que las variables en Vercel estén activas y que el proyecto de Supabase esté activo.'
    } else if (rawMsg) {
      userMsg = rawMsg
    }

    return {
      user: null,
      profile: null,
      error: userMsg,
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

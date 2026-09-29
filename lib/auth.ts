import { supabase } from './supabase'
import { User } from './supabase'

export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  phone?: string,
  /** Where to send the user once they click the verification link. */
  next?: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone
      },
      emailRedirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ''}`
        : undefined
    }
  })

  return { data, error }
}

/** Re-sends the sign-up verification email. */
export const resendVerification = async (email: string, next?: string) => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ''}`
        : undefined
    }
  })
  return { error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return { data, error }
}

/** Sends the reset link. `redirectTo` must be allow-listed in Supabase Auth → URL Configuration. */
export const requestPasswordReset = async (email: string, redirectTo: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  return { error }
}

export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password })
  return { error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export const getUserRole = async (): Promise<'buyer' | 'dealer' | 'admin' | null> => {
  const user = await getCurrentUser()
  return user?.user_type || null
}

export const updateProfile = async (userId: string, updates: Partial<User>) => {
  const safeUpdates = { ...updates }
  delete safeUpdates.user_type

  const { data, error } = await supabase
    .from('users')
    .update(safeUpdates)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

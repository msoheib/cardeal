import { supabase } from './supabase'
import { User } from './supabase'

export const signUp = async (email: string, password: string, fullName: string, userType: 'buyer' | 'dealer' = 'buyer') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        user_type: userType
      }
    }
  })
  
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return { data, error }
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
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}

export const createTestAccounts = async () => {
  // This would be used for demo/testing purposes
  const testAccounts = [
    {
      email: 'buyer@test.com',
      password: 'test123',
      fullName: 'أحمد المشتري',
      userType: 'buyer' as const
    },
    {
      email: 'dealer@test.com', 
      password: 'test123',
      fullName: 'معرض الرياض للسيارات',
      userType: 'dealer' as const
    },
    {
      email: 'admin@test.com',
      password: 'test123', 
      fullName: 'مدير المنصة',
      userType: 'admin' as const
    }
  ]
  
  return testAccounts
}
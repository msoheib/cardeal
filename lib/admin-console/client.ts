'use client'

import { supabase } from '@/lib/supabase'

export class AdminRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Calls /api/admin/* with the signed-in admin's access token. */
export async function adminFetch<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new AdminRequestError(401, 'انتهت الجلسة، سجّل الدخول مجدداً')

  const res = await fetch(`/api/admin/${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new AdminRequestError(res.status, payload?.error || 'تعذر تنفيذ الطلب')
  return payload as T
}

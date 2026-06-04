// lib/auth-data.ts
//
// Thin client-side wrappers around the /api/auth/* routes. The original
// localStorage-backed implementation lived here — it has been replaced with
// real HTTP calls to the Neon-backed API, but the exported function names
// stay the same so existing callers (auth-page, admin-panel, app/page)
// don't have to change anything beyond awaiting these.
//
// IMPORTANT: every function here is now async. Callers that used to treat
// `authenticateUser(...)` as synchronous have been updated.

import type { User } from './auth-types'

type SafeUserResponse = {
  id: string
  username: string
  email: string
  role: 'admin' | 'employee' | 'executive'
  department?: string
  fullName?: string
  company?: string
  createdAt: string
}

function toUser(u: SafeUserResponse): User {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    department: u.department,
    fullName: u.fullName,
    company: u.company,
    createdAt: new Date(u.createdAt),
  }
}

// Kept as a (now-unused) export so any straggler imports don't break the
// build. The real seeded users live in Postgres — see lib/db.ts.
export const defaultUsers: Array<User & { password: string }> = []

/**
 * Fetches all users from the API. Used by the admin panel.
 */
export async function getStoredUsers(): Promise<User[]> {
  try {
    const res = await fetch('/api/auth/users', { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { success: boolean; users?: SafeUserResponse[] }
    return data.users?.map(toUser) ?? []
  } catch (err) {
    console.error('getStoredUsers failed:', err)
    return []
  }
}

/**
 * No-op kept for source compatibility with the old localStorage
 * implementation. Each mutation now goes straight to the API.
 */
export function saveUsers(_users: User[]): void {
  /* intentionally empty — server is the source of truth now */
}

/**
 * Username/email + password login. Returns the user on success, null on
 * any failure (network, wrong creds, etc).
 */
export async function authenticateUser(
  identifier: string,
  password: string,
): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const data = (await res.json()) as { success: boolean; user?: SafeUserResponse }
    if (!res.ok || !data.success || !data.user) return null
    return toUser(data.user)
  } catch (err) {
    console.error('authenticateUser failed:', err)
    return null
  }
}

/**
 * Admin-side create-user (no OTP flow). The OTP-driven self-signup goes
 * through /api/auth/signup + /api/auth/verify-otp instead.
 */
export async function createNewUser(
  username: string,
  password: string,
  email: string,
  department: string,
  role: 'admin' | 'employee' | 'executive',
  fullName?: string,
  company?: string,
): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, department, role, fullName, company }),
    })
    const data = (await res.json()) as { success: boolean; user?: SafeUserResponse }
    if (!res.ok || !data.success || !data.user) return null
    return toUser(data.user)
  } catch (err) {
    console.error('createNewUser failed:', err)
    return null
  }
}

/**
 * Admin-side delete-user.
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/auth/users?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    const data = (await res.json()) as { success: boolean }
    return res.ok && data.success
  } catch (err) {
    console.error('deleteUser failed:', err)
    return false
  }
}

/**
 * Kept as an exported no-op for source compatibility — schema and seed
 * data are managed by lib/db.ts on the server.
 */
export function initializeAuth(): void {
  /* intentionally empty */
}

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { pool, ensureSchema, toSafeUser, type DbUserRow } from '@/lib/db'
import { demoUsers } from '@/lib/demo-users'

function getFallbackUser(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase()
  const user = demoUsers.find(
    (u) => u.username.toLowerCase() === normalized || u.email.toLowerCase() === normalized,
  )
  if (!user) return null
  return bcrypt.compare(password, user.passwordHash).then((ok) => (ok ? user : null))
}

// POST /api/auth/login
//
// Accepts { identifier, password } where identifier matches either a username
// OR an email (the original frontend behaviour). Returns the safe user
// (without password hash) on success.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { identifier?: string; password?: string }
    const identifier = (body.identifier ?? '').trim()
    const password = body.password ?? ''

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Username/email and password are required.' },
        { status: 400 },
      )
    }

    let row: DbUserRow | null = null
    try {
      await ensureSchema()
      const result = await pool.query<DbUserRow>(
        `SELECT id, username, email, password, role, department, full_name, company, created_at
         FROM users
         WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
         LIMIT 1`,
        [identifier],
      )
      if (result.rowCount > 0) {
        row = result.rows[0]
      }
    } catch (err) {
      console.error('[Login] DB unavailable, falling back to demo users:', err)
    }

    if (row) {
      const ok = await bcrypt.compare(password, row.password)
      if (!ok) {
        return NextResponse.json(
          { success: false, message: 'Invalid username or password.' },
          { status: 401 },
        )
      }

      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        null
      pool
        .query(
          `INSERT INTO audit_logs (user_id, username, action, resource, ip_address, metadata)
           VALUES ($1, $2, 'auth.login', $3, $4, $5::jsonb)`,
          [row.id, row.username, `user:${row.id}`, ip, JSON.stringify({ role: row.role })],
        )
        .catch((err) => console.error('[audit] login log failed:', err))

      return NextResponse.json({ success: true, user: toSafeUser(row) })
    }

    const demoUser = await getFallbackUser(identifier, password)
    if (demoUser) {
      return NextResponse.json({
        success: true,
        user: {
          id: String(demoUser.id),
          username: demoUser.username,
          email: demoUser.email,
          role: demoUser.role,
          department: demoUser.department ?? undefined,
          fullName: demoUser.full_name ?? undefined,
          company: demoUser.company ?? undefined,
          createdAt: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid username or password.' },
      { status: 401 },
    )
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, message: 'Login failed. Please try again.' },
      { status: 500 },
    )
  }
}

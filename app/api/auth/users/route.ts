import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { pool, ensureSchema, toSafeUser, type DbUserRow } from '@/lib/db'
import { ensureUserFolder, type FolderCategory } from '@/lib/drive'

function roleToCategory(role: 'admin' | 'employee' | 'executive'): FolderCategory {
  if (role === 'admin') return 'admin'
  if (role === 'executive') return 'executives'
  return 'employees'
}

// GET /api/auth/users
//
// Returns all users (without password hashes). Used by the admin panel.
export async function GET() {
  try {
    await ensureSchema()
    const result = await pool.query<DbUserRow>(
      `SELECT id, username, email, password, role, department, full_name, company, created_at
       FROM users
       ORDER BY id ASC`,
    )
    return NextResponse.json({ success: true, users: result.rows.map(toSafeUser) })
  } catch (error) {
    console.error('List users API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 },
    )
  }
}

// POST /api/auth/users
//
// Admin-side create-user (no OTP — used when an admin onboards someone
// manually). Body matches the original createNewUser helper:
//   { username, password, email, department, role, fullName?, company? }
export async function POST(request: NextRequest) {
  try {
    await ensureSchema()
    const body = (await request.json()) as {
      username?: string
      password?: string
      email?: string
      department?: string
      role?: 'admin' | 'employee' | 'executive'
      fullName?: string
      company?: string
    }

    const username = (body.username ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''
    const role = body.role ?? 'employee'

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'username, email and password are required' },
        { status: 400 },
      )
    }

    const hash = await bcrypt.hash(password, 10)

    const insert = await pool.query<DbUserRow>(
      `INSERT INTO users (username, email, password, role, department, full_name, company)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, email, password, role, department, full_name, company, created_at`,
      [
        username,
        email,
        hash,
        role,
        body.department ?? null,
        body.fullName ?? null,
        body.company ?? null,
      ],
    )

    if (insert.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 409 },
      )
    }

    const createdRow = insert.rows[0]

    // Fire-and-forget folder provisioning. See verify-otp/route.ts for the
    // same rationale — Drive failures shouldn't block account creation.
    ensureUserFolder(roleToCategory(createdRow.role), createdRow.username).catch((err) => {
      console.error('[users] Failed to provision folder for', createdRow.username, err)
    })

    return NextResponse.json({ success: true, user: toSafeUser(createdRow) })
  } catch (error) {
    console.error('Create user API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 },
    )
  }
}

// DELETE /api/auth/users?id=<id>
//
// Admin-side delete. The seed admin (id=1) is protected — same rule the
// frontend already enforces.
export async function DELETE(request: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, message: 'id query param required' }, { status: 400 })
    }
    if (id === '1') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete the seed admin account' },
        { status: 403 },
      )
    }
    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [Number(id)])
    return NextResponse.json({ success: true, deleted: result.rowCount ?? 0 })
  } catch (error) {
    console.error('Delete user API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete user' },
      { status: 500 },
    )
  }
}

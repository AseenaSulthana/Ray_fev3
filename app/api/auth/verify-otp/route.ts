import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifyOTPAndGetPending } from '@/lib/emailService'
import { pool, ensureSchema, toSafeUser, type DbUserRow } from '@/lib/db'
import { ensureUserFolder, type FolderCategory } from '@/lib/drive'

// Translate a user's role into the storage category their folder lives under.
function roleToCategory(role: 'admin' | 'employee' | 'executive'): FolderCategory {
  if (role === 'admin') return 'admin'
  if (role === 'executive') return 'executives'
  return 'employees'
}

// POST /api/auth/verify-otp
//
// Step 2 of the signup flow. We:
//   1. Verify the OTP and atomically retrieve the pending signup payload
//   2. Hash the password and INSERT the user into Neon
//   3. Return the safe user so the client can drop them straight into the
//      app, fully logged in.
//
// We still support OTP verification without a pending payload (the original
// behaviour) so flows like "verify an existing email" keep working.
export async function POST(request: NextRequest) {
  try {
    await ensureSchema()

    const { email, otp } = (await request.json()) as { email?: string; otp?: string }
    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email and OTP are required' },
        { status: 400 },
      )
    }

    const result = verifyOTPAndGetPending(email, otp)
    if (!result.ok) {
      const msg =
        result.reason === 'expired'
          ? 'This code has expired. Please request a new one.'
          : 'Invalid OTP. Please try again.'
      return NextResponse.json({ success: false, message: msg }, { status: 400 })
    }

    // If there's no pending signup attached (e.g. the OTP was sent through
    // the old /send-otp route for a different reason), nothing left to do.
    if (!result.pending) {
      return NextResponse.json({ success: true, message: 'OTP verified successfully' })
    }

    const p = result.pending
    const hash = await bcrypt.hash(p.password, 10)

    // Race-safe insert: another tab could have completed signup with the
    // same username/email between /signup and /verify-otp. ON CONFLICT lets
    // us detect that cleanly.
    const insert = await pool.query<DbUserRow>(
      `INSERT INTO users (username, email, password, role, department, full_name, company)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, email, password, role, department, full_name, company, created_at`,
      [
        p.username,
        p.email.toLowerCase(),
        hash,
        p.role,
        p.department ?? null,
        p.fullName ?? null,
        p.company ?? null,
      ],
    )

    if (insert.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'This username or email was just taken. Please log in or pick a different one.',
        },
        { status: 409 },
      )
    }

    const createdRow = insert.rows[0]

    // Provision the new user's storage folder. We don't want this to block
    // signup success if it fails — Drive being down should not prevent a
    // user from logging in. The folder gets lazily created on first upload
    // anyway via ensureUserFolder().
    ensureUserFolder(roleToCategory(createdRow.role), createdRow.username).catch((err) => {
      console.error('[signup] Failed to provision folder for', createdRow.username, err)
    })

    return NextResponse.json({
      success: true,
      message: 'OTP verified and account created',
      user: toSafeUser(createdRow),
    })
  } catch (error) {
    console.error('Verify OTP API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to verify OTP' },
      { status: 500 },
    )
  }
}

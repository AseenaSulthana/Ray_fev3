import { NextRequest, NextResponse } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'
import { generateOTP, sendOTPEmail, type PendingSignup } from '@/lib/emailService'

// POST /api/auth/signup
//
// Step 1 of the signup flow. The client submits the full signup form here;
// we:
//   1. Validate the input
//   2. Reject if username or email is already taken
//   3. Generate an OTP and stash the full payload in the in-memory store
//      keyed by email
//   4. Email the OTP to the user
//
// The user is NOT inserted into the DB yet — that happens in /verify-otp
// after the code is confirmed. This avoids orphan unverified accounts.
export async function POST(request: NextRequest) {
  try {
    await ensureSchema()

    const body = (await request.json()) as Partial<PendingSignup> & {
      // Front-end SignupPage uses "name" for the display name; we map it to
      // fullName here.
      name?: string
    }

    const username = (body.username ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''
    const role = body.role ?? 'employee'
    const fullName = (body.fullName ?? body.name ?? '').trim() || undefined
    const company = (body.company ?? '').trim() || undefined
    const department = (body.department ?? '').trim() || undefined

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Username, email, and password are required.' },
        { status: 400 },
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters.' },
        { status: 400 },
      )
    }
    if (!['admin', 'employee', 'executive'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role.' },
        { status: 400 },
      )
    }
    if (role === 'employee' && !department) {
      return NextResponse.json(
        { success: false, message: 'Department is required for employee accounts.' },
        { status: 400 },
      )
    }

    // Conflict check. Done case-insensitively to match the indices in db.ts.
    const existing = await pool.query<{ id: number }>(
      `SELECT id FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)
       LIMIT 1`,
      [username, email],
    )
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this username or email already exists. Try signing in instead.',
        },
        { status: 409 },
      )
    }

    const pending: PendingSignup = {
      username,
      email,
      password, // plaintext lives in memory only; hashed before DB insert
      role: role as PendingSignup['role'],
      fullName,
      company,
      department: department ?? (role === 'admin' ? 'Management' : 'Leadership'),
    }

    const otp = generateOTP()
    const sent = await sendOTPEmail(email, otp, pending)

    return NextResponse.json({
      success: true,
      message: sent
        ? `Verification code sent to ${email}. Check your inbox.`
        : `Verification code generated for ${email}. Email is not configured — check server logs for the code.`,
    })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to start signup. Please try again.' },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { ensureSchema, query } from '@/lib/db'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// GET /api/employees
//
// Returns the directory of employee records used by the admin user-management
// page. Distinct from /api/auth/users which returns login accounts.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    await ensureSchema()
    const result = await query(
      `SELECT id, user_id, employee_code, name, designation, experience_years,
              email, mobile, department, has_access, credentials_created,
              last_access_at, last_access_location, created_at
       FROM employees
       ORDER BY id ASC`,
    )
    return NextResponse.json({
      success: true,
      employees: result.rows.map((r: any) => ({
        id: String(r.id),
        userId: r.user_id != null ? String(r.user_id) : null,
        employeeId: r.employee_code,
        name: r.name,
        designation: r.designation,
        experience: r.experience_years,
        email: r.email,
        mobile: r.mobile,
        department: r.department,
        hasAccess: r.has_access,
        credentialsCreated: r.credentials_created,
        lastAccess:
          r.last_access_at
            ? {
                time: new Date(r.last_access_at).toLocaleString(),
                location: r.last_access_location ?? '',
              }
            : null,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('List employees error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list employees' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/employees
//
// Insert (or bulk-insert if `rows` array is provided) employee records.
// Used by the manual create form AND by the Excel import flow.
// ---------------------------------------------------------------------------
interface EmployeeInput {
  employeeId?: string
  name: string
  designation?: string
  experience?: number
  email: string
  mobile?: string
  department?: string
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema()
    const body = (await request.json()) as
      | { rows: EmployeeInput[] }
      | EmployeeInput

    const rows: EmployeeInput[] = Array.isArray((body as any).rows)
      ? (body as { rows: EmployeeInput[] }).rows
      : [body as EmployeeInput]

    const inserted: any[] = []
    const skipped: { email: string; reason: string }[] = []

    for (const r of rows) {
      if (!r.name || !r.email) {
        skipped.push({ email: r.email ?? '(missing)', reason: 'name and email are required' })
        continue
      }
      try {
        const res = await query(
          `INSERT INTO employees
             (employee_code, name, designation, experience_years, email, mobile, department)
           VALUES ($1, $2, $3, $4, LOWER($5), $6, $7)
           ON CONFLICT (email) DO NOTHING
           RETURNING id, employee_code, name, designation, experience_years,
                     email, mobile, department, has_access, credentials_created, created_at`,
          [
            r.employeeId ?? null,
            r.name,
            r.designation ?? null,
            Number.isFinite(r.experience) ? r.experience : 0,
            r.email,
            r.mobile ?? null,
            r.department ?? null,
          ],
        )
        if (res.rowCount === 0) {
          skipped.push({ email: r.email, reason: 'duplicate email' })
        } else {
          inserted.push(res.rows[0])
        }
      } catch (err) {
        skipped.push({ email: r.email, reason: (err as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount: inserted.length,
      skippedCount: skipped.length,
      inserted,
      skipped,
    })
  } catch (error) {
    console.error('Create employees error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create employee(s)' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/employees?id=<id>
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(request.url)
    const id = Number(searchParams.get('id'))
    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, message: 'id required' }, { status: 400 })
    }
    const res = await query(`DELETE FROM employees WHERE id = $1`, [id])
    return NextResponse.json({ success: true, deleted: res.rowCount ?? 0 })
  } catch (error) {
    console.error('Delete employee error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete' },
      { status: 500 },
    )
  }
}

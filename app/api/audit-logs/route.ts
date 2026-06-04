import { NextRequest, NextResponse } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/audit-logs?limit=200&action=<filter>&user=<filter>
//
// Returns recent audit log entries for the admin dashboard. We cap the
// page size at 1000 to protect the DB; the UI paginates client-side.
export async function GET(request: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 1000)
    const actionFilter = searchParams.get('action') || ''
    const userFilter = searchParams.get('user') || ''

    const params: any[] = []
    const conditions: string[] = []
    if (actionFilter) {
      params.push(`%${actionFilter}%`)
      conditions.push(`action ILIKE $${params.length}`)
    }
    if (userFilter) {
      params.push(`%${userFilter}%`)
      conditions.push(`username ILIKE $${params.length}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    params.push(limit)

    const res = await pool.query(
      `SELECT id, user_id, username, action, resource, metadata, ip_address, created_at
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params,
    )

    return NextResponse.json({
      success: true,
      logs: res.rows.map((r: any) => ({
        id: String(r.id),
        userId: r.user_id != null ? String(r.user_id) : null,
        username: r.username,
        action: r.action,
        resource: r.resource,
        metadata: r.metadata,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('List audit logs error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list audit logs' },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/alerts?status=open|resolved|all
export async function GET(request: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    let q = `SELECT id, title, description, severity, status, source,
                    created_by, resolved_by, resolved_at, created_at
             FROM alerts`
    const params: any[] = []
    if (status !== 'all') {
      params.push(status)
      q += ` WHERE status = $${params.length}`
    }
    q += ` ORDER BY
            CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
            created_at DESC`

    const res = await pool.query(q, params)

    // Severity counts for the four dashboard cards.
    const countsRes = await pool.query(
      `SELECT severity, status, COUNT(*)::int AS n
       FROM alerts
       GROUP BY severity, status`,
    )
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0,
    } as Record<string, number>
    for (const r of countsRes.rows as any[]) {
      if (r.status === 'resolved') counts.resolved += r.n
      else counts[r.severity as string] = (counts[r.severity as string] ?? 0) + r.n
    }

    return NextResponse.json({
      success: true,
      alerts: res.rows.map((r: any) => ({
        id: String(r.id),
        title: r.title,
        description: r.description,
        severity: r.severity,
        status: r.status,
        source: r.source,
        createdBy: r.created_by != null ? String(r.created_by) : null,
        resolvedBy: r.resolved_by != null ? String(r.resolved_by) : null,
        resolvedAt: r.resolved_at,
        createdAt: r.created_at,
      })),
      counts,
    })
  } catch (error) {
    console.error('List alerts error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list alerts' },
      { status: 500 },
    )
  }
}

// POST /api/alerts  — create new alert
// Body: { title, description?, severity, source?, createdBy? }
export async function POST(request: NextRequest) {
  try {
    await ensureSchema()
    const body = (await request.json()) as {
      title: string
      description?: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      source?: string
      createdBy?: number
    }
    if (!body.title || !body.severity) {
      return NextResponse.json(
        { success: false, message: 'title and severity required' },
        { status: 400 },
      )
    }
    if (!['critical', 'high', 'medium', 'low'].includes(body.severity)) {
      return NextResponse.json({ success: false, message: 'Invalid severity' }, { status: 400 })
    }
    const res = await pool.query(
      `INSERT INTO alerts (title, description, severity, source, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        body.title,
        body.description ?? null,
        body.severity,
        body.source ?? 'manual',
        body.createdBy ?? null,
      ],
    )
    return NextResponse.json({ success: true, id: String(res.rows[0].id) })
  } catch (error) {
    console.error('Create alert error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create alert' },
      { status: 500 },
    )
  }
}

// PATCH /api/alerts  — resolve / acknowledge
// Body: { id, status, resolvedBy? }
export async function PATCH(request: NextRequest) {
  try {
    await ensureSchema()
    const body = (await request.json()) as {
      id: number
      status: 'open' | 'acknowledged' | 'resolved'
      resolvedBy?: number
    }
    if (!body.id || !body.status) {
      return NextResponse.json({ success: false, message: 'id and status required' }, { status: 400 })
    }
    if (!['open', 'acknowledged', 'resolved'].includes(body.status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
    }
    await pool.query(
      `UPDATE alerts
         SET status = $1,
             resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE NULL END,
             resolved_by = CASE WHEN $1 = 'resolved' THEN $2 ELSE NULL END
       WHERE id = $3`,
      [body.status, body.resolvedBy ?? null, body.id],
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update alert error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update alert' },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/documents/[id]/history?as=<userId>
// Returns recent audit log entries related to the document. Only the owner
// or admins may fetch the history.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureSchema()
    const { id } = await context.params
    const docId = Number(id)
    if (!Number.isFinite(docId)) {
      return NextResponse.json({ success: false, message: 'Invalid document id' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const asId = Number(searchParams.get('as'))
    if (!Number.isFinite(asId)) {
      return NextResponse.json({ success: false, message: 'Missing `as`' }, { status: 400 })
    }

    const callerRes = await pool.query(`SELECT id, role FROM users WHERE id = $1`, [asId])
    if (callerRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Caller not found' }, { status: 404 })
    }
    const caller = callerRes.rows[0]

    const docRes = await pool.query(`SELECT owner_id FROM documents WHERE id = $1`, [docId])
    if (docRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 })
    }
    const ownerId = docRes.rows[0].owner_id

    if (caller.role !== 'admin' && caller.id !== ownerId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const logs = await pool.query(
      `SELECT id, user_id, username, action, resource, metadata, ip_address, created_at
       FROM audit_logs
       WHERE resource = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [`document:${docId}`],
    )

    return NextResponse.json({ success: true, logs: logs.rows })
  } catch (err) {
    console.error('Document history error:', err)
    return NextResponse.json({ success: false, message: 'Failed to fetch history' }, { status: 500 })
  }
}

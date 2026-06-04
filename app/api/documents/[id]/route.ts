import { NextRequest, NextResponse } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'
import { deleteFile } from '@/lib/drive'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// DELETE /api/documents/[id]?as=<userId>
//
// Removes the file from the storage backend AND deletes the metadata row.
// Allowed for: the document owner, or any admin.
// ---------------------------------------------------------------------------
export async function DELETE(
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
      return NextResponse.json(
        { success: false, message: 'Missing `as` query param.' },
        { status: 400 },
      )
    }

    const callerRes = await pool.query<{ id: number; role: string; username: string }>(
      `SELECT id, role, username FROM users WHERE id = $1`,
      [asId],
    )
    if (callerRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Caller not found' }, { status: 404 })
    }
    const caller = callerRes.rows[0]

    const docRes = await pool.query<{
      owner_id: number
      file_id: string
      storage_driver: 'drive' | 'local'
      name: string
    }>(
      `SELECT owner_id, file_id, storage_driver, name FROM documents WHERE id = $1`,
      [docId],
    )
    if (docRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 })
    }
    const doc = docRes.rows[0]

    if (doc.owner_id !== caller.id && caller.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'You can only delete your own documents.' },
        { status: 403 },
      )
    }

    // Best-effort delete from storage. If the underlying file is already
    // gone we still want to remove the DB row.
    await deleteFile(doc.file_id, doc.storage_driver).catch((err) => {
      console.error('[documents] storage delete failed:', err)
    })

    await pool.query(`DELETE FROM documents WHERE id = $1`, [docId])
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, resource, metadata)
       VALUES ($1, $2, 'document.delete', $3, $4::jsonb)`,
      [caller.id, caller.username, `document:${docId}`, JSON.stringify({ name: doc.name })],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete document' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/documents/[id]?as=<userId>
//
// Update sharing settings for a document. Admins and executives can manage it.
// Body: { visibility?, visibleRole?, shareWith?, unshareWith? }
// ---------------------------------------------------------------------------
export async function PATCH(
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

    const callerRes = await pool.query<{ id: number; role: string; username: string }>(
      `SELECT id, role, username FROM users WHERE id = $1`,
      [asId],
    )
    if (callerRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Caller not found' }, { status: 404 })
    }
    const caller = callerRes.rows[0]
    if (!['admin', 'executive'].includes(caller.role)) {
      return NextResponse.json(
        { success: false, message: 'Only admins and executives can update sharing.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      visibility?: 'private' | 'shared' | 'role'
      visibleRole?: 'admin' | 'employee' | 'executive' | null
      department?: string | null
      departments?: string[] | null
      shareWith?: number[]
      unshareWith?: number[]
    }

    if (body.visibility && !['private', 'shared', 'role'].includes(body.visibility)) {
      return NextResponse.json({ success: false, message: 'Invalid visibility' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      if (body.visibility || body.visibility === null) {
        await client.query(
          `UPDATE documents
             SET visibility = COALESCE($1, visibility),
                 visible_role = $2,
                 updated_at = NOW()
           WHERE id = $3`,
          [body.visibility ?? null, body.visibleRole ?? null, docId],
        )
      }

      if (Object.prototype.hasOwnProperty.call(body, 'department')) {
        await client.query(
          `UPDATE documents SET department = $1, updated_at = NOW() WHERE id = $2`,
          [body.department ?? null, docId],
        )
      }

      if (Object.prototype.hasOwnProperty.call(body, 'departments')) {
        const departments = Array.isArray(body.departments)
          ? body.departments
              .filter((dept) => typeof dept === 'string')
              .map((dept) => dept.trim())
              .filter(Boolean)
          : []

        await client.query(`DELETE FROM document_departments WHERE document_id = $1`, [docId])
        for (const department of departments) {
          await client.query(
            `INSERT INTO document_departments (document_id, department)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [docId, department],
          )
        }

        await client.query(
          `UPDATE documents SET department = $1, updated_at = NOW() WHERE id = $2`,
          [departments[0] ?? null, docId],
        )
      }

      if (Array.isArray(body.shareWith)) {
        for (const granteeId of body.shareWith.filter(Number.isFinite)) {
          await client.query(
            `INSERT INTO document_shares (document_id, user_id, granted_by)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [docId, granteeId, caller.id],
          )
        }
      }

      if (Array.isArray(body.unshareWith)) {
        for (const granteeId of body.unshareWith.filter(Number.isFinite)) {
          await client.query(
            `DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2`,
            [docId, granteeId],
          )
        }
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, username, action, resource, metadata)
         VALUES ($1, $2, 'document.share_update', $3, $4::jsonb)`,
        [caller.id, caller.username, `document:${docId}`, JSON.stringify(body)],
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Patch document error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update document' },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'
import { uploadFile, type FolderCategory } from '@/lib/drive'

// We use the Node runtime (default for route handlers) — googleapis needs
// Node-only built-ins (streams, fs) that aren't available on the Edge.
export const runtime = 'nodejs'

function roleToCategory(role: 'admin' | 'employee' | 'executive'): FolderCategory {
  if (role === 'admin') return 'admin'
  if (role === 'executive') return 'executives'
  return 'employees'
}

// ---------------------------------------------------------------------------
// GET /api/documents
//
// Returns the documents visible to the calling user. Authorization here is
// based on a `?as=<userId>` query param. In a production app you'd verify a
// signed session cookie instead; this MVP relies on the trusted Next.js
// client (the React app already gates the UI by role).
//
// Visibility rules:
//   - The user always sees documents they own.
//   - Admins see every document.
//   - Documents with visibility='shared' are visible to everyone.
//   - Documents with visibility='role' are visible to users whose role
//     matches visible_role.
//   - Documents explicitly shared via document_shares are visible to the
//     named user.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await ensureSchema()
    const { searchParams } = new URL(request.url)
    const asId = searchParams.get('as')
    if (!asId) {
      return NextResponse.json(
        { success: false, message: 'Missing `as` query param (user id of the caller).' },
        { status: 400 },
      )
    }
    const userIdNum = Number(asId)
    if (!Number.isFinite(userIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user id.' },
        { status: 400 },
      )
    }

    // Resolve the calling user's role (used for the visibility filter).
    const userRes = await pool.query<{ id: number; role: 'admin' | 'employee' | 'executive' }>(
      `SELECT id, role FROM users WHERE id = $1`,
      [userIdNum],
    )
    if (userRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 })
    }
    const caller = userRes.rows[0]

    // Admins see everything; everyone else gets the filtered query.
    const baseSelect = `
      SELECT d.id, d.owner_id, d.category, d.department, d.file_id, d.storage_driver, d.name,
             d.mime_type, d.size_bytes, d.web_view_link, d.visibility, d.visible_role,
             (SELECT array_agg(user_id) FROM document_shares s WHERE s.document_id = d.id) AS shared_with,
             (SELECT array_agg(dd.department ORDER BY dd.department)
                FROM document_departments dd
               WHERE dd.document_id = d.id) AS departments,
             d.tags, d.summary, d.created_at, d.updated_at,
             u.username AS owner_username
      FROM documents d
      LEFT JOIN users u ON u.id = d.owner_id
    `
    let result
    if (caller.role === 'admin') {
      result = await pool.query(`${baseSelect} ORDER BY d.created_at DESC`)
    } else {
      // Non-admins only see documents they own, shared, role-matching, or
      // explicitly granted, AND the document must either have no department
      // mapping or match their department (owners always see their own docs).
      result = await pool.query(
        `${baseSelect}
         WHERE (d.owner_id = $1
            OR d.visibility = 'shared'
            OR (d.visibility = 'role' AND d.visible_role = $2)
            OR EXISTS (
                 SELECT 1 FROM document_shares s
                 WHERE s.document_id = d.id AND s.user_id = $1
               ))
         AND (
              d.owner_id = $1
              OR NOT EXISTS (
                   SELECT 1 FROM document_departments dd
                   WHERE dd.document_id = d.id
                 )
              OR EXISTS (
                   SELECT 1 FROM document_departments dd
                   WHERE dd.document_id = d.id AND dd.department = $3
                 )
         )
         ORDER BY d.created_at DESC`,
        [caller.id, caller.role, caller.department],
      )
    }

    const docs = result.rows.map((r: any) => ({
      id: String(r.id),
      ownerId: String(r.owner_id),
      ownerUsername: r.owner_username,
      category: r.category,
      fileId: r.file_id,
      storageDriver: r.storage_driver,
      name: r.name,
      mimeType: r.mime_type,
      sizeBytes: Number(r.size_bytes),
      webViewLink: r.web_view_link,
      visibility: r.visibility,
      visibleRole: r.visible_role,
      tags: r.tags ?? [],
      department: r.department ?? null,
      departments: (r.departments ?? []).filter((dept: any) => typeof dept === 'string'),
      sharedWith: (r.shared_with ?? []).map((n: any) => String(n)),
      summary: r.summary,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return NextResponse.json({ success: true, documents: docs })
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list documents' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/documents
//
// Multipart upload. Form fields:
//   - file:       binary file (required)
//   - ownerId:    numeric user id of the uploader (required)
//   - visibility: 'private' | 'shared' | 'role'  (default 'private')
//   - visibleRole: when visibility='role', one of admin/employee/executive
//   - shareWith:  JSON array of user ids to grant per-user access to
//                 (only valid if uploader is admin)
//   - summary:    optional short description
//   - tags:       JSON array of tag strings
//   - departments: JSON array of department strings
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    await ensureSchema()

    const form = await request.formData()
    const file = form.get('file')
    const ownerId = form.get('ownerId')
    if (!file || !(file instanceof Blob) || !ownerId) {
      return NextResponse.json(
        { success: false, message: 'file and ownerId are required' },
        { status: 400 },
      )
    }
    const ownerIdNum = Number(ownerId)
    if (!Number.isFinite(ownerIdNum)) {
      return NextResponse.json({ success: false, message: 'Invalid ownerId' }, { status: 400 })
    }

    const ownerRes = await pool.query<{
      id: number
      username: string
      role: 'admin' | 'employee' | 'executive'
    }>(`SELECT id, username, role FROM users WHERE id = $1`, [ownerIdNum])
    if (ownerRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Owner not found' }, { status: 404 })
    }
    const owner = ownerRes.rows[0]

    const visibility = (form.get('visibility') as string) || 'private'
    if (!['private', 'shared', 'role'].includes(visibility)) {
      return NextResponse.json({ success: false, message: 'Invalid visibility' }, { status: 400 })
    }

    // Only admins are allowed to make documents broadly visible. We silently
    // downgrade non-admin uploads to 'private' rather than failing — the UI
    // hides those controls anyway.
    const effectiveVisibility = owner.role === 'admin' ? visibility : 'private'

    const visibleRoleRaw = form.get('visibleRole') as string | null
    const visibleRole =
      effectiveVisibility === 'role' && visibleRoleRaw &&
      ['admin', 'employee', 'executive'].includes(visibleRoleRaw)
        ? visibleRoleRaw
        : null

    const summary = (form.get('summary') as string) || null
    const departmentsRaw = form.get('departments') as string | null
    const departmentRaw = (form.get('department') as string) || null
    let departments: string[] = []
    if (departmentsRaw) {
      try {
        const parsed = JSON.parse(departmentsRaw)
        if (Array.isArray(parsed)) {
          departments = parsed
            .filter((dept) => typeof dept === 'string')
            .map((dept) => dept.trim())
            .filter(Boolean)
        }
      } catch {
        /* ignore bad departments */
      }
    } else if (departmentRaw) {
      departments = [departmentRaw.trim()].filter(Boolean)
    }
    let tags: string[] = []
    const tagsRaw = form.get('tags') as string | null
    if (tagsRaw) {
      try {
        const parsed = JSON.parse(tagsRaw)
        if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === 'string').slice(0, 20)
      } catch {
        /* ignore bad tags */
      }
    }

    let shareWith: number[] = []
    const shareWithRaw = form.get('shareWith') as string | null
    if (shareWithRaw && owner.role === 'admin') {
      try {
        const parsed = JSON.parse(shareWithRaw)
        if (Array.isArray(parsed)) shareWith = parsed.map(Number).filter(Number.isFinite)
      } catch {
        /* ignore bad shareWith */
      }
    }

    // Read the file into memory. We accept up to ~50 MB — see next.config.mjs.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filename =
      (file as any).name && typeof (file as any).name === 'string'
        ? ((file as any).name as string)
        : 'upload.bin'
    const mimeType = file.type || 'application/octet-stream'

    const uploaded = await uploadFile({
      category: roleToCategory(owner.role),
      username: owner.username,
      filename,
      mimeType,
      data: buffer,
    })

    // Persist the metadata. We do this in a transaction so the shares insert
    // can't leave orphan rows if it fails mid-way.
    const client = await pool.connect()
    let docId: number
    try {
      await client.query('BEGIN')
      const docRes = await client.query<{ id: number }>(
        `INSERT INTO documents (
            owner_id, category, department, file_id, storage_driver, name, mime_type,
            size_bytes, web_view_link, visibility, visible_role, tags, summary
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id`,
        [
          owner.id,
          roleToCategory(owner.role),
          departments[0] ?? null,
          uploaded.fileId,
          uploaded.driver,
          uploaded.name,
          uploaded.mimeType,
          uploaded.size,
          uploaded.webViewLink ?? null,
          effectiveVisibility,
          visibleRole,
          tags,
          summary,
        ],
      )
      docId = docRes.rows[0].id

      for (const dept of departments) {
        await client.query(
          `INSERT INTO document_departments (document_id, department)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [docId, dept],
        )
      }

      // Insert explicit shares, if any. We let admins share with anyone;
      // duplicates are silently ignored.
      for (const granteeId of shareWith) {
        if (granteeId === owner.id) continue
        await client.query(
          `INSERT INTO document_shares (document_id, user_id, granted_by)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [docId, granteeId, owner.id],
        )
      }

      // Audit log entry.
      await client.query(
        `INSERT INTO audit_logs (user_id, username, action, resource, metadata)
         VALUES ($1, $2, 'document.upload', $3, $4::jsonb)`,
        [
          owner.id,
          owner.username,
          `document:${docId}`,
          JSON.stringify({
            name: uploaded.name,
            size: uploaded.size,
            visibility: effectiveVisibility,
            driver: uploaded.driver,
          }),
        ],
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return NextResponse.json({
      success: true,
      document: {
        id: String(docId),
        ownerId: String(owner.id),
        ownerUsername: owner.username,
        category: roleToCategory(owner.role),
        department: departments[0] ?? null,
        departments,
        fileId: uploaded.fileId,
        storageDriver: uploaded.driver,
        name: uploaded.name,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.size,
        webViewLink: uploaded.webViewLink,
        visibility: effectiveVisibility,
        visibleRole,
        tags,
        summary,
      },
    })
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json(
      { success: false, message: (error as Error).message || 'Upload failed' },
      { status: 500 },
    )
  }
}

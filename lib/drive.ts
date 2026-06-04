// lib/drive.ts
//
// Google Drive helper for the RAY knowledge base.
//
// Design philosophy: this module exposes a single uniform API
// (`uploadFile`, `deleteFile`, `getDownloadUrl`, `ensureUserFolder`)
// that is backed by ONE of two storage drivers:
//
//   1. **Google Drive** — when a service account is configured via
//      env vars (see SETUP-DRIVE.md), all uploads go to Drive under a
//      single root folder (DRIVE_ROOT_FOLDER_ID), organised as:
//
//         <root>/admin/<username>/
//         <root>/employees/<username>/
//         <root>/executives/<username>/
//
//   2. **Local disk fallback** — when Drive isn't configured, files
//      are stored under `./uploads/<category>/<username>/`. This means
//      the app still works end-to-end during development without
//      requiring everyone to have a Google Cloud project. The local
//      driver is NOT for production.
//
// Both drivers return the same shape (`UploadedFile`) so the rest of
// the app doesn't care which one is active.

import 'server-only'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { Readable } from 'stream'

// `google` is loaded lazily so the local-disk fallback can run without
// the googleapis package even being installed (handy for tests / CI).
type GoogleDriveClient = any

export type FolderCategory = 'admin' | 'employees' | 'executives'

export interface UploadedFile {
  /** Drive file id, or a local-relative path when running in fallback mode. */
  fileId: string
  /** Original filename. */
  name: string
  /** MIME type. */
  mimeType: string
  /** Size in bytes. */
  size: number
  /** Where the file physically lives. Used to pick the right delete/download. */
  driver: 'drive' | 'local'
  /** Web link the user can open (Drive webViewLink, or our /api/files endpoint for local). */
  webViewLink?: string
}

// ---------------------------------------------------------------------------
// Configuration & driver selection
// ---------------------------------------------------------------------------

const DRIVE_ENABLED = (() => {
  // We require BOTH a service account key and a root folder id. Either
  // one missing → fall back to local disk.
  const hasKey =
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    !!process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  const hasRoot = !!process.env.DRIVE_ROOT_FOLDER_ID
  return hasKey && hasRoot
})()

const DRIVE_ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID || ''
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// Memoize the Drive client and folder ids across HMR reloads.
type CachedFolders = Partial<Record<FolderCategory, string>>
type CachedUserFolders = Record<string, string> // key: `${category}:${username}`

type GlobalDrive = typeof globalThis & {
  __rayDriveClient?: GoogleDriveClient
  __rayDriveCategoryFolders?: CachedFolders
  __rayDriveUserFolders?: CachedUserFolders
}
const g = globalThis as GlobalDrive
g.__rayDriveCategoryFolders ??= {}
g.__rayDriveUserFolders ??= {}

async function getDriveClient(): Promise<GoogleDriveClient> {
  if (!DRIVE_ENABLED) {
    throw new Error('Drive is not configured — caller should use local driver.')
  }
  if (g.__rayDriveClient) return g.__rayDriveClient

  // Dynamic import so the local-fallback path doesn't pull in googleapis.
  const { google } = await import('googleapis')

  let credentials: Record<string, any>
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Inline JSON in the env var. Useful for hosted environments where
    // you can't drop a file on disk (Vercel, Render).
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    const raw = await fs.readFile(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf-8')
    credentials = JSON.parse(raw)
  } else {
    throw new Error('No service account credentials available.')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  const drive = google.drive({ version: 'v3', auth })
  g.__rayDriveClient = drive
  return drive
}

// ---------------------------------------------------------------------------
// Folder management
// ---------------------------------------------------------------------------

const MIME_FOLDER = 'application/vnd.google-apps.folder'

/**
 * Find a sub-folder by name inside a parent, or create it if missing.
 * Returns the folder id.
 */
async function ensureDriveFolder(
  drive: GoogleDriveClient,
  name: string,
  parentId: string,
): Promise<string> {
  // Drive query syntax — escape single quotes in the name to prevent
  // breaking the query string.
  const safeName = name.replace(/'/g, "\\'")
  const q = `name = '${safeName}' and mimeType = '${MIME_FOLDER}' and '${parentId}' in parents and trashed = false`
  const search = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 1,
  })
  if (search.data.files && search.data.files.length > 0 && search.data.files[0].id) {
    return search.data.files[0].id
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: MIME_FOLDER,
      parents: [parentId],
    },
    fields: 'id',
  })
  if (!created.data.id) {
    throw new Error(`Drive folder create returned no id for ${name}`)
  }
  return created.data.id
}

/** Ensure the top-level category folder (admin / employees / executives) exists. */
async function ensureCategoryFolder(category: FolderCategory): Promise<string> {
  if (g.__rayDriveCategoryFolders![category]) {
    return g.__rayDriveCategoryFolders![category] as string
  }
  const drive = await getDriveClient()
  const id = await ensureDriveFolder(drive, category, DRIVE_ROOT_FOLDER_ID)
  g.__rayDriveCategoryFolders![category] = id
  return id
}

/**
 * Ensure a per-user folder exists for a given (category, username) pair.
 * Returns the folder id (Drive) or the absolute path (local).
 *
 * This is called from /api/auth/signup right after a new user is verified,
 * and from /api/auth/users when an admin creates a user manually — so every
 * account has its own folder waiting for them on first login.
 */
export async function ensureUserFolder(
  category: FolderCategory,
  username: string,
): Promise<{ driver: 'drive' | 'local'; folderId: string }> {
  if (!DRIVE_ENABLED) {
    const dir = path.join(LOCAL_UPLOADS_DIR, category, sanitizeName(username))
    await fs.mkdir(dir, { recursive: true })
    return { driver: 'local', folderId: dir }
  }

  const cacheKey = `${category}:${username}`
  if (g.__rayDriveUserFolders![cacheKey]) {
    return { driver: 'drive', folderId: g.__rayDriveUserFolders![cacheKey] }
  }

  const drive = await getDriveClient()
  const categoryFolderId = await ensureCategoryFolder(category)
  const userFolderId = await ensureDriveFolder(drive, sanitizeName(username), categoryFolderId)
  g.__rayDriveUserFolders![cacheKey] = userFolderId
  return { driver: 'drive', folderId: userFolderId }
}

function sanitizeName(s: string): string {
  // Strip path separators and control chars. Drive itself is permissive
  // about filenames but we play conservative for both backends.
  return s.replace(/[\/\\\x00-\x1f]/g, '_').slice(0, 200) || 'unnamed'
}

// ---------------------------------------------------------------------------
// Upload / delete / download
// ---------------------------------------------------------------------------

/**
 * Upload a file (already in memory as a Buffer) into a user's folder.
 * Returns the unified UploadedFile metadata.
 */
export async function uploadFile(params: {
  category: FolderCategory
  username: string
  filename: string
  mimeType: string
  data: Buffer
}): Promise<UploadedFile> {
  const { category, username, filename, mimeType, data } = params
  const safeName = sanitizeName(filename)

  if (!DRIVE_ENABLED) {
    // Local fallback
    const { folderId: dir } = await ensureUserFolder(category, username)
    const uniqueName = `${Date.now()}-${safeName}`
    const fullPath = path.join(dir, uniqueName)
    await fs.writeFile(fullPath, data)
    // Build a stable relative id used by /api/files to look this up.
    const relative = path.relative(LOCAL_UPLOADS_DIR, fullPath).replace(/\\/g, '/')
    return {
      fileId: relative,
      name: safeName,
      mimeType,
      size: data.length,
      driver: 'local',
      webViewLink: `/api/files/${encodeURI(relative)}`,
    }
  }

  // Drive path
  const drive = await getDriveClient()
  const { folderId } = await ensureUserFolder(category, username)
  // Wrap buffer in a readable stream for the Drive client.
  const stream = Readable.from(data)
  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [folderId],
      mimeType,
    },
    media: { mimeType, body: stream },
    fields: 'id, name, mimeType, size, webViewLink',
  })
  if (!created.data.id) throw new Error('Drive upload returned no id')

  return {
    fileId: created.data.id,
    name: created.data.name || safeName,
    mimeType: created.data.mimeType || mimeType,
    size: Number(created.data.size ?? data.length),
    driver: 'drive',
    webViewLink: created.data.webViewLink ?? undefined,
  }
}

/** Delete a file by id. */
export async function deleteFile(
  fileId: string,
  driver: 'drive' | 'local',
): Promise<void> {
  if (driver === 'local') {
    const fullPath = path.join(LOCAL_UPLOADS_DIR, fileId)
    // Refuse to delete anything outside the uploads dir (defense-in-depth
    // against malicious fileId values from the DB).
    const resolved = path.resolve(fullPath)
    if (!resolved.startsWith(path.resolve(LOCAL_UPLOADS_DIR))) {
      throw new Error('Refusing to delete file outside uploads dir')
    }
    await fs.unlink(resolved).catch(() => undefined)
    return
  }
  const drive = await getDriveClient()
  await drive.files.delete({ fileId })
}

/**
 * Get a readable stream + metadata for a stored file. Used by the
 * local /api/files endpoint to serve files back to the browser. For
 * Drive-stored files we just hand back webViewLink and don't proxy.
 */
export async function readLocalFile(
  relativeId: string,
): Promise<{ stream: import('fs').ReadStream; size: number; mimeType: string }> {
  const fullPath = path.join(LOCAL_UPLOADS_DIR, relativeId)
  const resolved = path.resolve(fullPath)
  if (!resolved.startsWith(path.resolve(LOCAL_UPLOADS_DIR))) {
    throw new Error('Refusing to read file outside uploads dir')
  }
  const stat = await fs.stat(resolved)
  const ext = path.extname(resolved).toLowerCase()
  const mimeType =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === '.txt'
          ? 'text/plain'
          : 'application/octet-stream'
  return {
    stream: createReadStream(resolved),
    size: stat.size,
    mimeType,
  }
}

export const driveStatus = {
  enabled: DRIVE_ENABLED,
  rootFolderId: DRIVE_ROOT_FOLDER_ID,
  localUploadsDir: LOCAL_UPLOADS_DIR,
}

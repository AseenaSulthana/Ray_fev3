// lib/db.ts
//
// Neon (Postgres) connection module for RAY.
//
// What this file does:
//   1. Creates a single, app-wide `pg.Pool` connected to Neon over SSL.
//   2. On the first DB call after the server boots, it auto-runs schema
//      migrations (CREATE TABLE IF NOT EXISTS …) so tables always exist.
//   3. On the same first call, it seeds the three demo accounts
//      (admin / john.smith / executive) so the existing demo logins keep
//      working out of the box.
//
// `import 'server-only'` makes Next.js refuse to bundle this module into a
// client component by mistake — DB credentials only ever live on the server.

import 'server-only'
import { Pool, type PoolClient, type QueryResult } from 'pg'
import bcrypt from 'bcryptjs'
import { demoUsers } from '@/lib/demo-users'

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

// In dev with hot-reload (Next.js / Turbopack), this module gets re-imported
// repeatedly. Without stashing the pool on globalThis we would leak a new
// Pool every reload and quickly exhaust Neon's connection limit. Same
// pattern we use for the OTP store.
type GlobalWithPool = typeof globalThis & {
  __rayPgPool?: Pool
  __raySchemaReady?: Promise<void>
}
const g = globalThis as GlobalWithPool

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL must be defined in environment variables')
}

function createPool(): Pool {
  const created = new Pool({
    connectionString,
    // Neon requires SSL. We don't pin a CA because Neon rotates certs;
    // rejectUnauthorized:false is the documented pattern for serverless +
    // Neon and matches what `?sslmode=require` implies in the URL.
    ssl: { rejectUnauthorized: false },
    // Keep the pool small — serverless/edge runtimes spin up many instances,
    // and Neon's free tier caps total connections.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

  created.on('error', (err) => {
    console.error('[DB] Pool error:', err)
  })
  return created
}

export let pool: Pool = g.__rayPgPool ?? createPool()
if (!g.__rayPgPool) g.__rayPgPool = pool

async function recreatePool() {
  if (pool) {
    try {
      await pool.end()
    } catch (err) {
      console.error('[DB] Error closing old pool:', err)
    }
  }
  pool = createPool()
  g.__rayPgPool = pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params)
  } catch (error: any) {
    const message = String(error?.message ?? '')
    const shouldReconnect = /terminated unexpectedly|connection timeout|timeout|ECONNRESET|EPIPE/i.test(message)
    if (shouldReconnect) {
      console.warn('[DB] Query failed, recreating pool and retrying:', message)
      await recreatePool()
      return await pool.query<T>(text, params)
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Schema + seed (runs once per server process)
// ---------------------------------------------------------------------------

// All migrations are idempotent (`IF NOT EXISTS`) so calling this repeatedly
// is safe. We still memoize the Promise so concurrent requests during boot
// share one execution.
async function runSchemaAndSeed(): Promise<void> {
  const client: PoolClient = await pool.connect()
  try {
    // -- Users table --------------------------------------------------------
    // `id` is a serial so the existing string-based ids ('1','2','3'…) in
    // the frontend keep working when we return id::text.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        username     VARCHAR(100) UNIQUE NOT NULL,
        email        VARCHAR(255) UNIQUE NOT NULL,
        password     VARCHAR(255) NOT NULL,        -- bcrypt hash
        role         VARCHAR(20)  NOT NULL DEFAULT 'employee'
                       CHECK (role IN ('admin','employee','executive')),
        department   VARCHAR(100),
        full_name    VARCHAR(255),
        company      VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    // Helpful indices for the lookups we actually do (login by username or
    // email). UNIQUE constraints above already create btree indexes, but we
    // add a lower(email) index so case-insensitive logins are still fast.
    await client.query(`
      CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));
    `)

    // -- Seed demo accounts -------------------------------------------------
    // We keep the three accounts the original demo data shipped with. We
    // also keep `sarah.johnson` because some places in the app reference
    // multiple employees. ON CONFLICT DO UPDATE means re-running this on
    // every boot keeps the demo credentials and metadata consistent.
    for (const u of demoUsers) {
      await client.query(
        `INSERT INTO users (username, email, password, role, department, full_name, company)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (username) DO UPDATE
         SET email      = EXCLUDED.email,
             password   = EXCLUDED.password,
             role       = EXCLUDED.role,
             department = EXCLUDED.department,
             full_name  = EXCLUDED.full_name,
             company    = EXCLUDED.company`,
        [u.username, u.email, u.passwordHash, u.role, u.department, u.full_name, u.company],
      )
    }

    // -- Documents table ----------------------------------------------------
    // Every Knowledge Base upload lives here. `storage_driver` records
    // whether the file is in Google Drive ('drive') or the local-disk
    // fallback ('local') — see lib/drive.ts for the two-driver design.
    //
    // `category` mirrors the folder layout (admin/employees/executives).
    // `visibility`:
    //   - 'private'  → only the uploader and admins can see it
    //   - 'shared'   → admin opted to share with the entire org
    //   - 'role'     → visible to everyone with `role = visible_role`
    // For finer-grained sharing, use the `document_shares` join table.
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id              SERIAL PRIMARY KEY,
        owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category        VARCHAR(20) NOT NULL
                          CHECK (category IN ('admin','employees','executives')),
        file_id         TEXT NOT NULL,             -- Drive id OR local relative path
        storage_driver  VARCHAR(10) NOT NULL
                          CHECK (storage_driver IN ('drive','local')),
        name            VARCHAR(500) NOT NULL,
        department      VARCHAR(100),
        mime_type       VARCHAR(200),
        size_bytes      BIGINT NOT NULL DEFAULT 0,
        web_view_link   TEXT,
        visibility      VARCHAR(20) NOT NULL DEFAULT 'private'
                          CHECK (visibility IN ('private','shared','role')),
        visible_role    VARCHAR(20)
                          CHECK (visible_role IS NULL OR visible_role IN ('admin','employee','executive')),
        tags            TEXT[]  NOT NULL DEFAULT '{}',
        summary         TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    // Existing databases may already have a `documents` table from before
    // the department mapping feature landed. Add the column in-place so the
    // app can start without requiring a manual migration step.
    await client.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS department VARCHAR(100);`)
    await client.query(`CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents (owner_id);`)
    await client.query(`CREATE INDEX IF NOT EXISTS documents_category_idx ON documents (category);`)
    await client.query(`CREATE INDEX IF NOT EXISTS documents_visibility_idx ON documents (visibility);`)
    await client.query(`CREATE INDEX IF NOT EXISTS documents_department_idx ON documents (department);`)

    // -- Document shares ----------------------------------------------------
    // Per-user explicit grants. When an admin uploads a doc and ticks
    // "share with john.smith and sarah.johnson", we insert one row per
    // grantee here. The visibility rules in the API combine 'shared',
    // 'role', and this table to decide what each user can list.
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_shares (
        document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        granted_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (document_id, user_id)
      );
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS document_shares_user_idx ON document_shares (user_id);`)

    // -- Document departments ----------------------------------------------
    // Documents can be mapped to one or more departments after upload.
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_departments (
        document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        department   VARCHAR(100) NOT NULL,
        PRIMARY KEY (document_id, department)
      );
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS document_departments_department_idx ON document_departments (department);`)

    // -- Employees directory (admin dashboard) ------------------------------
    // Separate from `users` because the admin panel manages an HR-style
    // employee record (designation, experience, phone, etc) that may or
    // may not have a corresponding login account. If a login is created,
    // we link via `user_id`.
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id                   SERIAL PRIMARY KEY,
        user_id              INTEGER REFERENCES users(id) ON DELETE SET NULL,
        employee_code        VARCHAR(50)  UNIQUE,
        name                 VARCHAR(255) NOT NULL,
        designation          VARCHAR(255),
        experience_years     INTEGER NOT NULL DEFAULT 0,
        email                VARCHAR(255) UNIQUE NOT NULL,
        mobile               VARCHAR(50),
        department           VARCHAR(100),
        has_access           BOOLEAN NOT NULL DEFAULT TRUE,
        credentials_created  BOOLEAN NOT NULL DEFAULT FALSE,
        last_access_at       TIMESTAMPTZ,
        last_access_location VARCHAR(255),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS employees_dept_idx ON employees (department);`)

    // -- Audit logs ---------------------------------------------------------
    // Lightweight activity log. The frontend filters by user/action; we
    // index those for snappy queries.
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          BIGSERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username    VARCHAR(100),                 -- denormalised so deleted users still show
        action      VARCHAR(100) NOT NULL,        -- e.g. 'login','upload','share','delete_user'
        resource    VARCHAR(255),                 -- e.g. 'document:42','user:7'
        metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip_address  INET,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs (user_id);`)
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);`)
    await client.query(`CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);`)

    // -- Alerts & risks -----------------------------------------------------
    // Backing store for the AlertsRisks dashboard. Severity matches the
    // four cards (critical/high/medium/resolved). Resolution metadata
    // (resolved_at, resolved_by) is tracked so the dashboard can show
    // the resolved count.
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id           SERIAL PRIMARY KEY,
        title        VARCHAR(500) NOT NULL,
        description  TEXT,
        severity     VARCHAR(20) NOT NULL
                       CHECK (severity IN ('critical','high','medium','low')),
        status       VARCHAR(20) NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','acknowledged','resolved')),
        source       VARCHAR(100),                -- e.g. 'system','security','manual'
        created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        resolved_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
        resolved_at  TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS alerts_status_idx ON alerts (status);`)
    await client.query(`CREATE INDEX IF NOT EXISTS alerts_severity_idx ON alerts (severity);`)

    console.log('[DB] Schema ready and demo users seeded (idempotent).')
  } finally {
    client.release()
  }
}

/**
 * Call this at the top of every API route that touches the DB. The first
 * call kicks off schema setup; subsequent calls await the same promise and
 * return immediately. If the first init fails we clear the cache so the
 * next request retries instead of permanently failing.
 */
export function ensureSchema(): Promise<void> {
  if (!g.__raySchemaReady) {
    g.__raySchemaReady = runSchemaAndSeed().catch((err) => {
      g.__raySchemaReady = undefined
      console.error('[DB] Schema init failed:', err)
      throw err
    })
  }
  return g.__raySchemaReady
}

// ---------------------------------------------------------------------------
// Public row type
// ---------------------------------------------------------------------------

export interface DbUserRow {
  id: number
  username: string
  email: string
  password: string // bcrypt hash — never sent to the client
  role: 'admin' | 'employee' | 'executive'
  department: string | null
  full_name: string | null
  company: string | null
  created_at: Date
}

/** Shape we hand back to the client. Same fields as the original auth-types
 *  User, with `id` stringified and the password stripped. */
export interface SafeUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'employee' | 'executive'
  department?: string
  fullName?: string
  company?: string
  createdAt: string
}

export function toSafeUser(row: DbUserRow): SafeUser {
  return {
    id: String(row.id),
    username: row.username,
    email: row.email,
    role: row.role,
    department: row.department ?? undefined,
    fullName: row.full_name ?? undefined,
    company: row.company ?? undefined,
    createdAt: row.created_at.toISOString(),
  }
}

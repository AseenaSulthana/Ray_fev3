# RAY — Setup

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local` already has your Neon DB URL. On the first request the app
auto-creates all tables and seeds the demo accounts. No DB setup needed.

## What's in this build

### Authentication
- Sign-up form → server-side validation → email OTP → bcrypt-hashed password → user row in Neon. All dynamic, no hardcoded accounts.
- Login matches username **or** email (case-insensitive). Every login writes an `audit_logs` entry.
- Demo accounts (auto-seeded on first run; idempotent):

| Username      | Password | Role      |
| ------------- | -------- | --------- |
| admin         | admin123 | admin     |
| john.smith    | emp123   | employee  |
| sarah.johnson | emp123   | employee  |
| executive     | exec123  | executive |

### Database tables (auto-created)

| Table              | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `users`            | Login accounts with bcrypt password hashes                      |
| `documents`        | Knowledge-base files (Drive id OR local path + metadata)        |
| `document_shares`  | Per-user grants on individual documents                         |
| `employees`        | HR directory used by the admin user-management page             |
| `audit_logs`       | Login + upload + share + delete activity                        |
| `alerts`           | Risk / alert records for the admin alerts page                  |

### Knowledge base + Google Drive

Uploads go to Google Drive when configured, local disk otherwise. See
**SETUP-DRIVE.md** for the one-time Drive setup. Until you do that, files
land in `./uploads/<category>/<username>/`.

Folder layout (Drive or local — same in both modes):

```
<root>/
├── admin/
│   ├── admin/                ← admin@vexartech's docs
│   └── <other admin>/
├── employees/
│   ├── john.smith/
│   ├── sarah.johnson/
│   └── <new signups>/
└── executives/
    └── executive/
```

A folder is auto-created the first time a user uploads anything (or when an
admin creates the account, whichever comes first).

### Sharing model

When an admin uploads a file they pick one of four visibility settings:

- **Private** — only the admin sees it. (Default.)
- **Everyone** — every authenticated user sees it.
- **Specific role** — every user with `role = X` sees it.
- **Specific users** — a multi-select; tick the usernames that should have access. Stored in `document_shares`. Combinable with any of the three above.

Non-admin uploads are always private, no matter what the form sends.

The GET /api/documents endpoint applies these rules at query time:

```sql
WHERE owner_id = :caller
   OR visibility = 'shared'
   OR (visibility = 'role' AND visible_role = :caller_role)
   OR EXISTS (SELECT 1 FROM document_shares WHERE document_id = id AND user_id = :caller)
```

Admins always see everything.

### Admin → User Management

The "Employee Directory" page (Sidebar → User Management) is now fully
backed by the `employees` table:

- **GET /api/employees** on mount fills the table.
- **POST /api/employees** is called by both the manual "Add Employee" form and the Excel import. Duplicates (same email) are skipped server-side and reported back in the toast.
- **DELETE /api/employees?id=…** removes a row.

On a fresh DB the page starts empty. Use **Import from Excel** to bulk-load.

## Local-disk mode caveats

- Files are stored under `./uploads/` — gitignored.
- Served back through `GET /api/files/<relative-path>` (the page uses Drive's `webViewLink` instead, when Drive is configured).
- Not for production. Serverless platforms wipe their disk on each deploy.

## Security notes

- Bcrypt cost 10 on all passwords.
- Drive credentials never touch the client.
- OTP and pending-signup payload live in server memory only (15 min TTL).
- The DB URL has a fallback hardcoded in `lib/db.ts` so the app boots on first clone — **rotate that Neon password before any real use**; it was shared in chat.

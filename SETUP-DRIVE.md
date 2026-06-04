# Enabling Google Drive uploads

The Knowledge Base works out of the box using local-disk storage at `./uploads/`.
When you want uploads to land in your Google Drive instead, follow these steps.
You need a Google account.

## 1. Create a Google Cloud project

1. Go to https://console.cloud.google.com/
2. Click the project dropdown at the top → **New Project**.
3. Give it any name (e.g. `ray-knowledge-base`). Click **Create**.

## 2. Enable the Drive API

1. With your project selected, open the navigation menu → **APIs & Services** → **Library**.
2. Search for **Google Drive API**. Click it, then click **Enable**.

## 3. Create a service account

A service account is a non-human Google identity that the RAY server uses to
upload files on its own behalf. It does NOT share files with anyone unless you
tell it to.

1. Navigation menu → **IAM & Admin** → **Service Accounts** → **Create Service Account**.
2. Name: `ray-server`. Click **Create and continue**.
3. Skip the role grants (none needed at the project level). Click **Done**.

## 4. Generate a JSON key

1. Click the service account you just created.
2. Go to the **Keys** tab → **Add Key** → **Create new key** → **JSON** → **Create**.
3. A JSON file downloads. Keep it safe — it's a secret. Treat it like a password.

## 5. Create the Drive root folder and share it

The service account has its own Drive but no quota for new files. We work
around this by uploading into a folder in YOUR Drive that the service account
has been given Editor access to.

1. Open https://drive.google.com/ in your browser.
2. Create a folder called `RAY Knowledge Base` (or any name).
3. Right-click the folder → **Share**.
4. In the "Add people and groups" field, paste the service account's email
   (it looks like `ray-server@your-project.iam.gserviceaccount.com` — you can
   find it on the Service Accounts page).
5. Set the role to **Editor**. Untick "Notify people". Click **Send / Share**.
6. Open the folder. Copy the folder id from the URL — the long string after
   `/folders/`. Example: `https://drive.google.com/drive/folders/1aB2cD3eFg4HiJkLmNoPqRsTuVwXyZ` → id is `1aB2cD3eFg4HiJkLmNoPqRsTuVwXyZ`.

## 6. Wire it into RAY

Edit `.env.local`:

```
DRIVE_ROOT_FOLDER_ID=1aB2cD3eFg4HiJkLmNoPqRsTuVwXyZ
GOOGLE_SERVICE_ACCOUNT_FILE=/absolute/path/to/the-json-key-you-downloaded.json
```

Alternatively, if you'd rather not have the key on disk (e.g. on Vercel), put
the *contents* of the JSON file on a single line into `GOOGLE_SERVICE_ACCOUNT_JSON`:

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",...}
```

Restart `npm run dev`. The first upload will:

1. Auto-create `admin/`, `employees/`, `executives/` subfolders in your root.
2. Auto-create the uploader's personal subfolder, e.g. `employees/john.smith/`.
3. Upload the file there.
4. Save the Drive file id in Postgres so the file can be deleted later.

## What gets stored where

```
<your root folder>/
├── admin/
│   ├── admin/                  ← demo admin's docs
│   └── <other admin usernames>/
├── employees/
│   ├── john.smith/
│   ├── sarah.johnson/
│   └── <new employee signups>/
└── executives/
    └── executive/
```

Each document upload creates a single Drive file in the right user's folder.
Sharing controls (Private / Everyone / Role / specific users) are stored in
Postgres — they don't change the Drive file's permissions, because everything
flows through RAY's API which enforces visibility itself.

## Falling back to local disk

If `DRIVE_ROOT_FOLDER_ID` or the credentials are missing, RAY uses
`./uploads/<category>/<username>/`. Files are then served back through the
app at `/api/files/<relative-path>`. Local mode is for development only —
serverless deployments (Vercel, etc) reset their disk on each deploy.

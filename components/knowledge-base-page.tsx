'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DEPARTMENTS } from '@/lib/departments'
import {
  rayColors,
  rayTypography,
  getRayTint,
} from '@/lib/design-system'
import {
  Upload,
  Trash2,
  Eye,
  Search,
  FileText,
  Loader2,
  X,
  Settings,
  Globe,
  Shield,
  Building2,
  Lock,
  Tag,
  ChevronDown,
  Database,
  Files,
  FolderOpen,
  CloudUpload,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: string
  ownerId: string
  ownerUsername: string
  category: 'admin' | 'employees' | 'executives'
  fileId: string
  storageDriver: 'drive' | 'local'
  name: string
  mimeType?: string
  sizeBytes: number
  webViewLink?: string
  visibility: 'private' | 'shared' | 'role'
  visibleRole?: string | null
  tags: string[]
  department?: string | null
  sharedWith?: string[]
  departments?: string[]
  summary?: string | null
  createdAt: string
  updatedAt: string
  searchScore?: number
}

interface KnowledgeBasePageProps {
  role?: 'admin' | 'executive' | 'employee'
  currentUser?: { id: string; username: string; role: string } | null
}

type AccessMode = 'all' | 'private' | 'department' | 'admins'
type FilterTab = 'all' | 'shared' | 'private' | 'department'

// ---------------------------------------------------------------------------
// Shared page layout helpers (matches dashboard-page.tsx exactly)
// ---------------------------------------------------------------------------

const pageOuter = (bg: string): React.CSSProperties => ({
  flex: 1,
  overflowY: 'auto',
  background: bg,
  padding: '28px 28px 48px',
  fontFamily: rayTypography.family,
  color: rayColors.ink,
})

const innerWrap: React.CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
}

const mkCard = (border: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: rayColors.white,
  borderRadius: 12,
  border: `1px solid ${border}`,
  boxShadow: '0 1px 2px rgba(45, 27, 92, 0.04)',
  padding: 16,
  ...extra,
})

// ---------------------------------------------------------------------------
// Shared StatCard (identical to dashboard-page & ray-desk-page)
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  stripColor,
  border,
  valueColor,
}: {
  label: string
  value: string
  sub?: string
  stripColor: string
  border: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        background: rayColors.white,
        borderRadius: 12,
        border: `1px solid ${border}`,
        boxShadow: '0 1px 2px rgba(45, 27, 92, 0.04)',
        padding: 14,
        paddingTop: 18,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stripColor }} />
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: rayColors.inkMuted }}>
        {label}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 600, color: valueColor || rayColors.ink, letterSpacing: '-0.3px' }}>
        {value}
        {sub && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500, color: rayColors.inkMuted }}> · {sub}</span>}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared PageHeader (matches ray-desk PageHeader)
// ---------------------------------------------------------------------------

function PageHeader({ title, subtitle, actions, border }: { title: string; subtitle: string; actions?: React.ReactNode; border: string }) {
  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingBottom: 18, borderBottom: `1px solid ${border}` }}>
      <div>
        <h1 style={{ margin: '0 0 4px', ...rayTypography.h1 }}>{title}</h1>
        <p style={{ margin: 0, ...rayTypography.body }}>{subtitle}</p>
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>}
    </header>
  )
}

// ---------------------------------------------------------------------------
// File type icon helper
// ---------------------------------------------------------------------------

function FileTypeIcon({ mimeType, name }: { mimeType?: string; name?: string }) {
  const mime = (mimeType || '').toLowerCase()
  const ext = (name?.split('.').pop() || '').toLowerCase()
  const isPdf = mime.includes('pdf') || ext === 'pdf'
  const isSheet = mime.includes('sheet') || mime.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext)
  const isDoc = mime.includes('word') || mime.includes('document') || ['doc', 'docx'].includes(ext)

  const bg = isPdf ? '#fee2e2' : isSheet ? '#dcfce7' : isDoc ? '#dbeafe' : rayColors.purple100
  const color = isPdf ? '#dc2626' : isSheet ? '#16a34a' : isDoc ? '#2563eb' : rayColors.purple500

  return (
    <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FileText size={16} style={{ color }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visibility badge
// ---------------------------------------------------------------------------

function VisibilityBadge({ visibility, visibleRole, departments }: { visibility: string; visibleRole?: string | null; departments?: string[] }) {
  if (visibility === 'shared') {
    const hasDepts = departments && departments.length > 0
    return hasDepts ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
        <Building2 size={11} />
        {departments!.slice(0, 2).join(', ')}{departments!.length > 2 ? ` +${departments!.length - 2}` : ''}
      </span>
    ) : (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>
        <Globe size={11} />Everyone
      </span>
    )
  }
  if (visibility === 'role') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: rayColors.purple100, color: rayColors.purple600 }}>
        <Shield size={11} />{visibleRole === 'admin' ? 'Admins only' : `Role: ${visibleRole}`}
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: rayColors.purple50, color: rayColors.inkMuted }}>
      <Lock size={11} />Private
    </span>
  )
}

const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const formatDate = (iso: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function KnowledgeBasePage({ role = 'employee', currentUser }: KnowledgeBasePageProps) {
  const tint = getRayTint(role as any)
  const isAdmin = role === 'admin'
  const isExecutive = role === 'executive'
  const canManage = isAdmin || isExecutive

  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('semantic')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  // Drawer state
  const [drawerDocId, setDrawerDocId] = useState<string | null>(null)
  const [drawerState, setDrawerState] = useState<{ accessMode?: AccessMode; departments?: string[]; tags?: string[]; newTag?: string }>({})
  const [drawerSaving, setDrawerSaving] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // ── Data fetching ────────────────────────────────────────────────────────

  const refreshDocuments = async () => {
    if (!currentUser?.id) { setLoading(false); return }
    try {
      const res = await fetch(`/api/documents?as=${currentUser.id}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setDocuments(data.documents ?? [])
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refreshDocuments() }, [currentUser?.id])

  // Close drawer on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerDocId(null); setDepartmentMenuOpen(false)
      }
    }
    if (drawerDocId) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [drawerDocId])

  // ── Stats ────────────────────────────────────────────────────────────────

  const totalSize = useMemo(() => documents.reduce((s, d) => s + (d.sizeBytes || 0), 0), [documents])
  const sharedCount = useMemo(() => documents.filter((d) => d.visibility === 'shared').length, [documents])
  const privateCount = useMemo(() => documents.filter((d) => d.visibility === 'private').length, [documents])

  // ── Filtered docs ────────────────────────────────────────────────────────

  const filteredDocuments = useMemo(() => {
    let list = documents
    if (filterTab === 'shared') list = list.filter((d) => d.visibility === 'shared' && !(d.departments?.length))
    else if (filterTab === 'private') list = list.filter((d) => d.visibility === 'private')
    else if (filterTab === 'department') list = list.filter((d) => d.visibility === 'shared' && (d.departments?.length ?? 0) > 0)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (searchType === 'keyword') {
        list = list.filter((d) => d.name.toLowerCase().includes(q) || d.tags?.some((t) => t.toLowerCase().includes(q)))
      } else {
        list = list.map((d) => {
          let score = 0
          if (d.name.toLowerCase().includes(q)) score += 0.8
          if (d.summary?.toLowerCase().includes(q)) score += 0.6
          if (d.tags?.some((t) => t.toLowerCase().includes(q))) score += 0.4
          return { ...d, searchScore: score > 0 ? Math.min(score, 1) : undefined }
        }).filter((d) => d.searchScore !== undefined).sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0))
      }
    }
    return list
  }, [documents, filterTab, searchQuery, searchType])

  // ── Upload handlers ──────────────────────────────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!currentUser?.id) { setUploadError('You must be logged in to upload.'); return }
    setIsUploading(true); setUploadError('')
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file); form.append('ownerId', currentUser.id)
        const res = await fetch('/api/documents', { method: 'POST', body: form })
        const data = await res.json()
        if (!data.success) { setUploadError(data.message || 'Upload failed.'); break }
      }
      await refreshDocuments()
    } catch { setUploadError('Upload failed. Please try again.') }
    finally { setIsUploading(false) }
  }

  // Global drag-and-drop handlers on the page container
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current = 0; setIsDragging(false)
    void handleFileUpload(e.dataTransfer.files)
  }

  const handleDelete = async (id: string) => {
    if (!currentUser?.id || !confirm('Delete this document? This cannot be undone.')) return
    const res = await fetch(`/api/documents/${id}?as=${currentUser.id}`, { method: 'DELETE' })
    if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  // ── Drawer helpers ───────────────────────────────────────────────────────

  const openDrawer = (doc: DocumentRow) => {
    const currentDepartments = doc.departments ?? (doc.department ? [doc.department] : [])
    const accessMode: AccessMode =
      doc.visibility === 'shared' ? (currentDepartments.length > 0 ? 'department' : 'all')
      : doc.visibility === 'role' && doc.visibleRole === 'admin' ? 'admins'
      : 'private'
    setDrawerDocId(doc.id)
    setDrawerState({ accessMode, departments: currentDepartments, tags: doc.tags ?? [], newTag: '' })
    setDepartmentMenuOpen(false); setDrawerError('')
  }

  const closeDrawer = () => { setDrawerDocId(null); setDrawerState({}); setDepartmentMenuOpen(false); setDrawerError('') }

  const saveDrawer = async (docId: string) => {
    if (!currentUser?.id) return
    setDrawerSaving(true); setDrawerError('')
    try {
      const departments = (drawerState.departments ?? []).filter((d) => d.trim())
      const body: Record<string, unknown> = drawerState.tags ? { tags: drawerState.tags } : {}
      if (drawerState.accessMode === 'all') { body.visibility = 'shared'; body.visibleRole = null; body.departments = []; body.department = null }
      else if (drawerState.accessMode === 'department') { body.visibility = 'shared'; body.visibleRole = null; body.departments = departments; body.department = departments[0] ?? null }
      else if (drawerState.accessMode === 'admins') { body.visibility = 'role'; body.visibleRole = 'admin'; body.departments = []; body.department = null }
      else { body.visibility = 'private'; body.visibleRole = null; body.departments = []; body.department = null }

      const res = await fetch(`/api/documents/${docId}?as=${currentUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.success) { setDrawerError(data.message || 'Save failed.'); return }
      await refreshDocuments(); closeDrawer()
    } catch { setDrawerError('Save failed. Please try again.') }
    finally { setDrawerSaving(false) }
  }

  const addTag = () => {
    const tag = (drawerState.newTag || '').trim()
    if (!tag || (drawerState.tags ?? []).includes(tag)) return
    setDrawerState((s) => ({ ...s, tags: [...(s.tags ?? []), tag], newTag: '' }))
  }

  const removeTag = (tag: string) => setDrawerState((s) => ({ ...s, tags: (s.tags ?? []).filter((t) => t !== tag) }))

  const drawerDoc = drawerDocId ? documents.find((d) => d.id === drawerDocId) : null

  // ── Filter tabs ──────────────────────────────────────────────────────────

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: documents.length },
    { id: 'shared', label: 'Shared', count: sharedCount },
    { id: 'private', label: 'Private', count: privateCount },
    { id: 'department', label: 'By dept', count: documents.filter((d) => d.visibility === 'shared' && (d.departments?.length ?? 0) > 0).length },
  ]

  // ── Access mode options ──────────────────────────────────────────────────

  const accessOptions: { mode: AccessMode; label: string; desc: string; Icon: any }[] = [
    { mode: 'all', label: 'All users', desc: 'Visible to everyone in the organization', Icon: Globe },
    ...(isExecutive ? [{ mode: 'admins' as AccessMode, label: 'Admins only', desc: 'Only admin-role accounts', Icon: Shield }] : []),
    { mode: 'department', label: 'By department', desc: 'Select specific departments', Icon: Building2 },
    { mode: 'private', label: 'Only me', desc: 'Fully private to your account', Icon: Lock },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={pageOuter(tint.pageBackground)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-page drag overlay */}
      {isDragging && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 184, 212, 0.08)', backdropFilter: 'blur(2px)', pointerEvents: 'none' }}>
          <div style={{ background: rayColors.white, borderRadius: 16, border: `2px dashed ${rayColors.cyan500}`, padding: '40px 60px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0, 184, 212, 0.15)' }}>
            <CloudUpload size={40} style={{ color: rayColors.cyan500, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: rayColors.ink }}>Drop files to upload</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: rayColors.inkMuted }}>PDF, Word, Excel, CSV and more</p>
          </div>
        </div>
      )}

      {/* Drawer backdrop */}
      {drawerDocId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,18,64,0.15)', zIndex: 10 }} onClick={closeDrawer} />
      )}

      <div style={innerWrap}>

        {/* ── PAGE HEADER ── */}
        <PageHeader
          title="Knowledge Base"
          subtitle="Upload, organise, and control access to documents across your organisation."
          border={tint.cardBorder}
          actions={
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, background: rayColors.cyan500, color: rayColors.white, fontSize: 13, fontWeight: 600, cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1, fontFamily: rayTypography.family }}>
              {isUploading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
              {isUploading ? 'Uploading…' : 'Upload documents'}
              <input type="file" multiple className="hidden" disabled={isUploading} onChange={(e) => e.target.files && handleFileUpload(e.target.files)} style={{ display: 'none' }} />
            </label>
          }
        />

        {/* ── DRAG-AND-DROP UPLOAD ZONE ── */}
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '28px 20px',
            borderRadius: 12,
            border: `2px dashed ${isDragging ? rayColors.cyan500 : rayColors.borderMid}`,
            background: isDragging ? rayColors.cyan50 : rayColors.purple50,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <CloudUpload size={28} style={{ color: isDragging ? rayColors.cyan500 : rayColors.inkMuted }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isDragging ? rayColors.cyan600 : rayColors.ink }}>
              Drag files here, or <span style={{ color: rayColors.cyan500, textDecoration: 'underline' }}>browse to upload</span>
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: rayColors.inkMuted }}>
              PDF, Word, Excel, CSV, TXT · Max 50 MB per file
            </p>
          </div>
          <input type="file" multiple style={{ display: 'none' }} disabled={isUploading} onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />
        </label>

        {/* Upload error */}
        {uploadError && (
          <div style={mkCard(rayColors.danger, { background: '#fff1f2', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' })}>
            <span style={{ flex: 1, fontSize: 13, color: rayColors.danger }}>{uploadError}</span>
            <button onClick={() => setUploadError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: rayColors.danger, padding: 0 }}><X size={14} /></button>
          </div>
        )}

        {/* ── STAT ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatCard label="Total documents" value={documents.length.toString()} stripColor={rayColors.inkSoft} border={tint.cardBorder} />
          <StatCard label="Storage used" value={formatSize(totalSize)} stripColor={rayColors.purple500} border={tint.cardBorder} />
          <StatCard label="Shared" value={sharedCount.toString()} stripColor={rayColors.cyan500} border={tint.cardBorder} valueColor={rayColors.cyan600} />
          <StatCard label="Private" value={privateCount.toString()} stripColor={rayColors.purple400} border={tint.cardBorder} />
        </div>

        {/* ── SEARCH + FILTER ROW ── */}
        <div style={mkCard(tint.cardBorder, { padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 })}>
          {/* Search type toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${tint.cardBorder}`, flexShrink: 0 }}>
            {(['semantic', 'keyword'] as const).map((type) => (
              <button key={type} onClick={() => setSearchType(type)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: rayTypography.family, background: searchType === type ? rayColors.cyan500 : rayColors.white, color: searchType === type ? rayColors.white : rayColors.inkMuted, transition: 'all 0.15s' }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div style={{ flex: 1, minWidth: 220, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, color: rayColors.inkMuted, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder={searchType === 'semantic' ? 'Search by meaning or content…' : 'Search document names and tags…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 32px 8px 36px', borderRadius: 8, border: `1px solid ${tint.cardBorder}`, fontSize: 13, fontFamily: rayTypography.family, background: rayColors.white, color: rayColors.ink, outline: 'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: rayColors.inkMuted, padding: 0 }}><X size={14} /></button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterTab === tab.id ? rayColors.cyan500 : tint.cardBorder}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: rayTypography.family, background: filterTab === tab.id ? rayColors.cyan500 : rayColors.white, color: filterTab === tab.id ? rayColors.white : rayColors.inkMuted, transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                {tab.label}
                <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: filterTab === tab.id ? 'rgba(255,255,255,0.25)' : rayColors.purple50, color: filterTab === tab.id ? rayColors.white : rayColors.inkMuted }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── DOCUMENTS TABLE ── */}
        <div style={mkCard(tint.cardBorder, { padding: 0, overflow: 'hidden' })}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: rayTypography.family }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tint.cardBorder}`, background: rayColors.purple50 }}>
                  {['Document', 'Owner', 'Size', 'Access', ...(searchQuery && searchType === 'semantic' ? ['Relevance'] : []), 'Updated', ''].map((col) => (
                    <th key={col} style={{ textAlign: col === '' ? 'right' : 'left', padding: '10px 16px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: rayColors.inkMuted, whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: rayColors.inkMuted }}>
                    <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Loading documents…</p>
                  </td></tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: rayColors.inkMuted }}>
                    <FolderOpen size={40} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.25 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>{searchQuery ? 'No documents match your search.' : 'No documents yet. Upload one to get started.'}</p>
                  </td></tr>
                ) : filteredDocuments.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: `1px solid ${tint.cardBorder}`, background: drawerDocId === doc.id ? rayColors.cyan50 : 'transparent', transition: 'background 0.1s' }}>
                    {/* Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileTypeIcon mimeType={doc.mimeType} name={doc.name} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                          {doc.summary && <p style={{ margin: '2px 0 0', fontSize: 11, color: rayColors.inkMuted, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.summary}</p>}
                          {doc.tags && doc.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {doc.tags.slice(0, 3).map((tag) => (
                                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: rayColors.purple50, color: rayColors.inkMuted }}>
                                  <Tag size={9} />{tag}
                                </span>
                              ))}
                              {doc.tags.length > 3 && <span style={{ fontSize: 10, color: rayColors.inkMuted }}>+{doc.tags.length - 3}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Owner */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: rayColors.inkMuted, whiteSpace: 'nowrap' }}>{doc.ownerUsername}</td>
                    {/* Size */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: rayColors.inkMuted, whiteSpace: 'nowrap' }}>{formatSize(doc.sizeBytes)}</td>
                    {/* Visibility */}
                    <td style={{ padding: '12px 16px' }}><VisibilityBadge visibility={doc.visibility} visibleRole={doc.visibleRole} departments={doc.departments} /></td>
                    {/* Relevance (semantic search) */}
                    {searchQuery && searchType === 'semantic' && (
                      <td style={{ padding: '12px 16px' }}>
                        {doc.searchScore !== undefined && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 64, height: 6, background: rayColors.purple100, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${doc.searchScore * 100}%`, height: 6, background: rayColors.cyan500, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, color: rayColors.inkMuted }}>{(doc.searchScore * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                    )}
                    {/* Updated */}
                    <td style={{ padding: '12px 16px', fontSize: 11, color: rayColors.inkMuted, whiteSpace: 'nowrap' }}>{formatDate(doc.updatedAt)}</td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {doc.webViewLink && (
                          <a href={doc.webViewLink} target="_blank" rel="noreferrer noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: `1px solid ${tint.cardBorder}`, background: rayColors.white, fontSize: 12, fontWeight: 600, color: rayColors.inkMuted, textDecoration: 'none', fontFamily: rayTypography.family }}>
                            <Eye size={13} />View
                          </a>
                        )}
                        {(isAdmin || doc.ownerId === currentUser?.id) && (
                          <button onClick={() => handleDelete(doc.id)} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 8px', borderRadius: 6, border: `1px solid ${tint.cardBorder}`, background: rayColors.white, cursor: 'pointer', color: rayColors.danger }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => drawerDocId === doc.id ? closeDrawer() : openDrawer(doc)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: 'none', background: drawerDocId === doc.id ? rayColors.cyan500 : rayColors.purple100, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: drawerDocId === doc.id ? rayColors.white : rayColors.purple600, fontFamily: rayTypography.family, transition: 'all 0.15s' }}>
                            <Settings size={13} />Manage
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT-SIDE DRAWER
      ════════════════════════════════════════════════════════════════════ */}
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: 380,
          background: rayColors.white, borderLeft: `1px solid ${tint.cardBorder}`,
          boxShadow: '-8px 0 32px rgba(45,27,92,0.10)',
          display: 'flex', flexDirection: 'column', zIndex: 20,
          transform: drawerDocId ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          fontFamily: rayTypography.family,
        }}
      >
        {drawerDoc && (
          <>
            {/* Drawer header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${tint.cardBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <FileTypeIcon mimeType={drawerDoc.mimeType} name={drawerDoc.name} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawerDoc.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: rayColors.inkMuted }}>Document settings</p>
                </div>
              </div>
              <button onClick={closeDrawer} style={{ background: rayColors.purple50, border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: rayColors.inkMuted, flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Access control */}
              <section>
                <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: rayColors.inkMuted }}>Who can access</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {accessOptions.map(({ mode, label, desc, Icon }) => {
                    const sel = drawerState.accessMode === mode
                    return (
                      <label key={mode} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${sel ? rayColors.cyan400 : tint.cardBorder}`, background: sel ? rayColors.cyan50 : rayColors.white, transition: 'all 0.15s' }}>
                        <input type="radio" name="drawerAccess" checked={sel} onChange={() => { setDrawerState((s) => ({ ...s, accessMode: mode })); setDepartmentMenuOpen(mode === 'department') }} style={{ marginTop: 2, accentColor: rayColors.cyan500, flexShrink: 0 }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: rayColors.ink }}>
                            <Icon size={14} style={{ color: sel ? rayColors.cyan600 : rayColors.inkMuted }} />
                            {label}
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: rayColors.inkMuted }}>{desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {/* Department dropdown */}
                {drawerState.accessMode === 'department' && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: rayColors.inkMuted }}>Select departments</p>
                    <button type="button" onClick={() => setDepartmentMenuOpen((o) => !o)} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, border: `1px solid ${tint.cardBorder}`, background: rayColors.white, cursor: 'pointer', fontSize: 13, color: rayColors.ink, fontFamily: rayTypography.family }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(drawerState.departments?.length ? drawerState.departments : ['Select departments']).join(', ')}
                      </span>
                      <ChevronDown size={14} style={{ color: rayColors.inkMuted, flexShrink: 0, transform: departmentMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>
                    {departmentMenuOpen && (
                      <div style={{ maxHeight: 192, overflowY: 'auto', borderRadius: 8, border: `1px solid ${tint.cardBorder}`, background: rayColors.white, marginTop: 4, boxShadow: '0 4px 12px rgba(45,27,92,0.08)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: rayColors.ink, borderBottom: `1px solid ${tint.cardBorder}`, cursor: 'pointer' }}>
                          <input type="checkbox" style={{ accentColor: rayColors.cyan500 }} checked={(drawerState.departments ?? []).length === DEPARTMENTS.length} onChange={() => setDrawerState((s) => ({ ...s, departments: (s.departments ?? []).length === DEPARTMENTS.length ? [] : [...DEPARTMENTS] }))} />
                          Select all
                        </label>
                        {DEPARTMENTS.map((dept) => {
                          const selected = (drawerState.departments ?? []).includes(dept)
                          return (
                            <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', color: selected ? rayColors.cyan600 : rayColors.ink, fontWeight: selected ? 600 : 400 }}>
                              <input type="checkbox" style={{ accentColor: rayColors.cyan500 }} checked={selected} onChange={() => setDrawerState((s) => { const cur = s.departments ?? []; return { ...s, departments: selected ? cur.filter((i) => i !== dept) : [...cur, dept] } })} />
                              {dept}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Tags */}
              <section>
                <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: rayColors.inkMuted }}>Tags</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', borderRadius: 8, border: `1px solid ${tint.cardBorder}`, background: rayColors.white, minHeight: 40 }}>
                  {(drawerState.tags ?? []).map((tag) => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 999, background: rayColors.purple100, color: rayColors.inkSoft, fontWeight: 600 }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: rayColors.inkMuted, display: 'flex', alignItems: 'center' }}><X size={10} /></button>
                    </span>
                  ))}
                  <input type="text" value={drawerState.newTag || ''} onChange={(e) => setDrawerState((s) => ({ ...s, newTag: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Add tag…" style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: rayColors.ink, minWidth: 80, flex: 1, fontFamily: rayTypography.family }} />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: rayColors.inkMuted }}>Press Enter to add a tag</p>
              </section>

              {/* Info */}
              <section>
                <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: rayColors.inkMuted }}>Info</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Owner', drawerDoc.ownerUsername], ['Size', formatSize(drawerDoc.sizeBytes)], ['Storage', drawerDoc.storageDriver], ['Uploaded', formatDate(drawerDoc.createdAt)]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: rayColors.inkMuted }}>{k}</span>
                      <span style={{ color: rayColors.ink, fontWeight: 500, textTransform: k === 'Storage' ? 'capitalize' : 'none' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              {drawerError && <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fff1f2', border: `1px solid ${rayColors.danger}`, fontSize: 13, color: rayColors.danger }}>{drawerError}</div>}
            </div>

            {/* Drawer footer */}
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${tint.cardBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              {(isAdmin || drawerDoc.ownerId === currentUser?.id) && (
                <button onClick={() => { closeDrawer(); void handleDelete(drawerDoc.id) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${rayColors.danger}`, background: rayColors.white, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: rayColors.danger, fontFamily: rayTypography.family }}>
                  <Trash2 size={13} />Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={closeDrawer} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${tint.cardBorder}`, background: rayColors.white, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: rayColors.ink, fontFamily: rayTypography.family }}>Cancel</button>
              <button onClick={() => void saveDrawer(drawerDoc.id)} disabled={drawerSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', background: drawerSaving ? rayColors.cyan400 : rayColors.cyan500, cursor: drawerSaving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: rayColors.white, fontFamily: rayTypography.family }}>
                {drawerSaving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                {drawerSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

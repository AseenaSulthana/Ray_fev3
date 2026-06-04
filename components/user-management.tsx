'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  rayColors,
  rayTypography,
  getRayTint,
  inputStyle,
  buttonStyles,
} from '@/lib/design-system'
import {
  Plus,
  X,
  Trash2,
  Upload,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Copy,
  Users,
  ShieldCheck,
  Building2,
  FileWarning,
  Search,
  ChevronDown,
  UserPlus,
} from 'lucide-react'
import { DEFAULT_DEPARTMENT, DEPARTMENTS } from '@/lib/departments'
import { EmployeeImportModal } from './employee-import-modal'
import type { ImportRow } from '@/lib/employee-import'
import { createNewUser } from '@/lib/auth-data'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Employee = {
  id: string
  name: string
  designation: string
  experience: number
  email: string
  mobile: string
  docsUploaded: number
  department: string
  employeeId: string
  lastAccess: { time: string; location: string } | null
  hasAccess: boolean
  credentialsCreated: boolean
  createdAt: string
}

type CredFormState = {
  username: string
  password: string
  showPassword: boolean
  saving: boolean
  error: string
  success: boolean
  copied: boolean
}

// ---------------------------------------------------------------------------
// Shared layout helpers — identical tokens to dashboard/ray-desk/kb pages
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
// Shared StatCard — exact same shape as dashboard, ray-desk, knowledge-base
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
// Page header — same pattern as ray-desk / knowledge-base
// ---------------------------------------------------------------------------

function PageHeader({
  title,
  subtitle,
  actions,
  border,
}: {
  title: string
  subtitle: string
  actions?: React.ReactNode
  border: string
}) {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        paddingBottom: 18,
        borderBottom: `1px solid ${border}`,
      }}
    >
      <div>
        <h1 style={{ margin: '0 0 4px', ...rayTypography.h1 }}>{title}</h1>
        <p style={{ margin: 0, ...rayTypography.body }}>{subtitle}</p>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {actions}
        </div>
      )}
    </header>
  )
}

// ---------------------------------------------------------------------------
// Section label (matches ray-desk SectionLabel)
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: rayColors.inkMuted }}>
      {text}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Credential modal — the core new feature
// ---------------------------------------------------------------------------

function CredentialModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee: Employee
  onClose: () => void
  onSuccess: (employeeId: string) => void
}) {
  const suggestedUsername = employee.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '.')
  const suggestedPassword = `Ray@${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`

  const [form, setForm] = useState<CredFormState>({
    username: suggestedUsername,
    password: suggestedPassword,
    showPassword: false,
    saving: false,
    error: '',
    success: false,
    copied: false,
  })

  const handleSave = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setForm((s) => ({ ...s, error: 'Username and password are required.' }))
      return
    }
    if (form.password.length < 6) {
      setForm((s) => ({ ...s, error: 'Password must be at least 6 characters.' }))
      return
    }
    setForm((s) => ({ ...s, saving: true, error: '' }))
    try {
      const created = await createNewUser(
        form.username.trim(),
        form.password,
        employee.email,
        employee.department,
        'employee',
        employee.name,
      )
      if (!created) {
        setForm((s) => ({ ...s, saving: false, error: 'Could not create credentials — username or email may already be in use.' }))
        return
      }
      setForm((s) => ({ ...s, saving: false, success: true }))
      onSuccess(employee.id)
    } catch {
      setForm((s) => ({ ...s, saving: false, error: 'Failed to create credentials. Please try again.' }))
    }
  }

  const copyToClipboard = async () => {
    const text = `Username: ${form.username}\nPassword: ${form.password}`
    try {
      await navigator.clipboard.writeText(text)
      setForm((s) => ({ ...s, copied: true }))
      setTimeout(() => setForm((s) => ({ ...s, copied: false })), 2000)
    } catch {
      /* clipboard not available */
    }
  }

  const generatePassword = () => {
    const newPwd = `Ray@${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`
    setForm((s) => ({ ...s, password: newPwd, error: '' }))
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: rayColors.white, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(15,23,42,0.25)', fontFamily: rayTypography.family, overflow: 'hidden' }}
      >
        {/* Modal header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${rayColors.borderSoft}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: rayColors.cyan50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <KeyRound size={18} style={{ color: rayColors.cyan600 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, ...rayTypography.h2, fontSize: 16 }}>Create login credentials</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: rayColors.inkMuted }}>{employee.name} · {employee.department}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: rayColors.purple50, border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: rayColors.inkMuted }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Success state */}
          {form.success ? (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Check size={24} style={{ color: '#16a34a' }} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: rayColors.ink }}>Credentials created successfully</h4>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: rayColors.inkMuted }}>
                {employee.name} can now log in with these credentials.
              </p>
              {/* Credential summary card */}
              <div style={{ background: rayColors.purple50, borderRadius: 10, padding: '12px 16px', border: `1px solid ${rayColors.borderSoft}`, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: rayColors.inkMuted, fontWeight: 500 }}>Username</span>
                  <span style={{ fontWeight: 600, color: rayColors.ink, fontFamily: 'var(--font-mono)' }}>{form.username}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: rayColors.inkMuted, fontWeight: 500 }}>Password</span>
                  <span style={{ fontWeight: 600, color: rayColors.ink, fontFamily: 'var(--font-mono)' }}>{form.password}</span>
                </div>
              </div>
              <button
                onClick={copyToClipboard}
                style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: `1px solid ${rayColors.borderMid}`, background: rayColors.white, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: form.copied ? '#16a34a' : rayColors.ink, fontFamily: rayTypography.family }}
              >
                {form.copied ? <Check size={14} /> : <Copy size={14} />}
                {form.copied ? 'Copied!' : 'Copy credentials'}
              </button>
            </div>
          ) : (
            <>
              {/* Employee info strip */}
              <div style={{ background: rayColors.purple50, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${rayColors.borderSoft}` }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: rayColors.purple200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: rayColors.purple700 }}>
                    {employee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink }}>{employee.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: rayColors.inkMuted }}>{employee.email} · {employee.employeeId}</p>
                </div>
              </div>

              {/* Username */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionLabel text="Username" />
                <input
                  value={form.username}
                  onChange={(e) => setForm((s) => ({ ...s, username: e.target.value, error: '' }))}
                  placeholder="e.g. john.doe"
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                />
                <p style={{ margin: 0, fontSize: 11, color: rayColors.inkMuted }}>This is what the employee will type to log in.</p>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <SectionLabel text="Password" />
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: rayColors.cyan600, fontWeight: 600, fontFamily: rayTypography.family, padding: 0 }}
                  >
                    ↻ Generate new
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={form.showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value, error: '' }))}
                    placeholder="Min. 6 characters"
                    style={{ ...inputStyle, paddingRight: 40, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, showPassword: !s.showPassword }))}
                    style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: rayColors.inkMuted, display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    {form.showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Password strength bar */}
                {form.password.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: rayColors.purple100, overflow: 'hidden' }}>
                      <div style={{
                        height: 4, borderRadius: 2, transition: 'width 0.2s, background 0.2s',
                        width: form.password.length < 6 ? '25%' : form.password.length < 10 ? '60%' : '100%',
                        background: form.password.length < 6 ? rayColors.danger : form.password.length < 10 ? rayColors.warning : rayColors.cyan500,
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: form.password.length < 6 ? rayColors.danger : form.password.length < 10 ? rayColors.warning : rayColors.cyan500 }}>
                      {form.password.length < 6 ? 'Weak' : form.password.length < 10 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              {/* Error */}
              {form.error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff1f2', border: `1px solid ${rayColors.danger}`, fontSize: 13, color: rayColors.danger }}>
                  {form.error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal footer */}
        {!form.success && (
          <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${rayColors.borderSoft}` }}>
            <button onClick={onClose} style={{ ...buttonStyles.secondary, padding: '9px 18px' }}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={form.saving}
              style={{ ...buttonStyles.primary, padding: '9px 20px', background: rayColors.cyan500, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: form.saving ? 0.7 : 1, cursor: form.saving ? 'not-allowed' : 'pointer' }}
            >
              {form.saving
                ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Creating…</>
                : <><KeyRound size={14} />Create credentials</>
              }
            </button>
          </div>
        )}
        {form.success && (
          <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={onClose} style={{ ...buttonStyles.primary, padding: '9px 24px', background: rayColors.cyan500 }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UserManagement() {
  const tint = getRayTint('admin')

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importedSummary, setImportedSummary] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [credModalEmployee, setCredModalEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    name: '', designation: '', experience: '', email: '', mobile: '', department: DEFAULT_DEPARTMENT, employeeId: '',
  })

  // ── Data fetching ─────────────────────────────────────────────────────────

  const apiRowToEmployee = (r: any): Employee => ({
    id: String(r.id),
    name: r.name,
    designation: r.designation ?? '',
    experience: Number(r.experience) || 0,
    email: r.email,
    mobile: r.mobile ?? '',
    docsUploaded: 0,
    department: r.department ?? '',
    employeeId: r.employeeId ?? '',
    lastAccess: r.lastAccess ?? null,
    hasAccess: !!r.hasAccess,
    credentialsCreated: !!r.credentialsCreated,
    createdAt: typeof r.createdAt === 'string' ? new Date(r.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'),
  })

  const refreshEmployees = async () => {
    try {
      const res = await fetch('/api/employees', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.success) { setErrorMessage(data.message || 'Failed to load employees.'); return }
      setEmployees((data.employees ?? []).map(apiRowToEmployee))
    } catch { setErrorMessage('Could not reach the employees API.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void refreshEmployees() }, [])

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.hasAccess).length,
    departments: new Set(employees.map((e) => e.department)).size,
    noCreds: employees.filter((e) => !e.credentialsCreated).length,
  }), [employees])

  // ── Filtered employees ────────────────────────────────────────────────────

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesDept = deptFilter === 'all' || emp.department === deptFilter
      if (!matchesDept) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hay = `${emp.name} ${emp.email} ${emp.designation} ${emp.employeeId} ${emp.department}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [employees, deptFilter, searchQuery])

  const allDepts = useMemo(() => ['all', ...Array.from(new Set(employees.map((e) => e.department))).filter(Boolean).sort()], [employees])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createEmployee = async () => {
    if (!formData.name || !formData.designation || !formData.email || !formData.mobile) {
      setErrorMessage('Please fill all required fields.'); return
    }
    setErrorMessage('')
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, designation: formData.designation, experience: parseInt(formData.experience, 10) || 0, email: formData.email, mobile: formData.mobile, department: formData.department, employeeId: formData.employeeId.trim() || `EMP-${String(employees.length + 1).padStart(3, '0')}` }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setErrorMessage(data.message || 'Failed to create employee.'); return }
      setFormData({ name: '', designation: '', experience: '', email: '', mobile: '', department: DEFAULT_DEPARTMENT, employeeId: '' })
      setShowCreateForm(false)
      await refreshEmployees()
    } catch { setErrorMessage('Failed to create employee. Please try again.') }
  }

  const deleteEmployee = async (id: string) => {
    setErrorMessage('')
    try {
      const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.success) { setErrorMessage(data.message || 'Failed to delete employee.'); return }
      setEmployees((prev) => prev.filter((e) => e.id !== id))
    } catch { setErrorMessage('Failed to delete employee.') }
  }

  const handleImport = async (rows: ImportRow[]) => {
    setErrorMessage('')
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rows.map((row) => ({ name: row.name.trim(), designation: row.designation.trim(), experience: parseInt(row.experience, 10) || 0, email: row.email.trim(), mobile: row.mobile.trim(), department: row.department.trim() || DEFAULT_DEPARTMENT, employeeId: row.employeeId.trim() || undefined })) }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setErrorMessage(data.message || 'Import failed.'); return }
      await refreshEmployees()
      const parts = [`${data.insertedCount ?? 0} imported`]
      if ((data.skippedCount ?? 0) > 0) parts.push(`${data.skippedCount} skipped (duplicate)`)
      setImportedSummary(parts.join(' · '))
      setTimeout(() => setImportedSummary(''), 6000)
    } catch { setErrorMessage('Import failed. Please try again.') }
  }

  // Mark credentials as created locally (the modal calls createNewUser API)
  const handleCredSuccess = (employeeId: string) => {
    setEmployees((prev) => prev.map((e) => e.id === employeeId ? { ...e, credentialsCreated: true, hasAccess: true } : e))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={pageOuter(tint.pageBackground)}>
      <div style={innerWrap}>

        {/* ── PAGE HEADER ── */}
        <PageHeader
          title="User Management"
          subtitle="Manage employee records, system credentials, and access controls."
          border={tint.cardBorder}
          actions={
            <>
              <button
                style={{ ...buttonStyles.secondary, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', fontSize: 13, fontFamily: rayTypography.family }}
                onClick={() => setShowImportModal(true)}
              >
                <Upload size={14} /> Import Excel
              </button>
              <button
                style={{ ...buttonStyles.primary, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', fontSize: 13, background: rayColors.cyan500, fontFamily: rayTypography.family }}
                onClick={() => setShowCreateForm(true)}
              >
                <UserPlus size={14} /> Add Employee
              </button>
            </>
          }
        />

        {/* ── STAT ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatCard label="Total employees" value={stats.total.toString()} stripColor={rayColors.inkSoft} border={tint.cardBorder} />
          <StatCard label="Active access" value={stats.active.toString()} stripColor={rayColors.cyan500} border={tint.cardBorder} valueColor={rayColors.cyan600} />
          <StatCard label="Departments" value={stats.departments.toString()} stripColor={rayColors.purple500} border={tint.cardBorder} />
          <StatCard label="No credentials" value={stats.noCreds.toString()} stripColor={stats.noCreds > 0 ? rayColors.warning : rayColors.cyan500} border={tint.cardBorder} valueColor={stats.noCreds > 0 ? rayColors.warning : undefined} />
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div style={mkCard(rayColors.danger, { background: '#fff1f2', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' })}>
            <span style={{ flex: 1, fontSize: 13, color: rayColors.danger }}>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: rayColors.danger, padding: 0 }}><X size={14} /></button>
          </div>
        )}

        {/* ── CREATE FORM ── */}
        {showCreateForm && (
          <div style={mkCard(tint.cardBorder, { padding: 20 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, ...rayTypography.h2, fontSize: 15 }}>New employee record</p>
                <p style={{ margin: '2px 0 0', ...rayTypography.body, fontSize: 12 }}>Fill in the details to add this person to the directory.</p>
              </div>
              <button style={{ background: rayColors.purple50, border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: rayColors.inkMuted }} onClick={() => setShowCreateForm(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { key: 'name', placeholder: 'Full name *', type: 'text' },
                { key: 'designation', placeholder: 'Designation *', type: 'text' },
                { key: 'email', placeholder: 'Email address *', type: 'email' },
                { key: 'mobile', placeholder: 'Mobile number *', type: 'text' },
                { key: 'experience', placeholder: 'Experience (years)', type: 'number' },
                { key: 'employeeId', placeholder: 'Employee ID (optional)', type: 'text' },
              ].map(({ key, placeholder, type }) => (
                <input
                  key={key}
                  type={type}
                  placeholder={placeholder}
                  value={(formData as any)[key]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  style={inputStyle}
                />
              ))}
              <select style={inputStyle} value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button style={{ ...buttonStyles.secondary, padding: '9px 18px', fontSize: 13 }} onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button style={{ ...buttonStyles.primary, padding: '9px 18px', fontSize: 13, background: rayColors.cyan500, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: rayTypography.family }} onClick={createEmployee}>
                <Plus size={14} /> Create employee
              </button>
            </div>
          </div>
        )}

        {/* ── SEARCH + FILTER BAR ── */}
        <div style={mkCard(tint.cardBorder, { padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 })}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, color: rayColors.inkMuted, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name, email, designation, ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36, paddingRight: searchQuery ? 32 : 12 }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: rayColors.inkMuted, padding: 0 }}><X size={14} /></button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ ...inputStyle, paddingRight: 30, width: 'auto', appearance: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              <option value="all">All departments</option>
              {allDepts.filter((d) => d !== 'all').map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: rayColors.inkMuted }} />
          </div>
          <span style={{ fontSize: 12, color: rayColors.inkMuted, fontWeight: 500, flexShrink: 0 }}>
            {filteredEmployees.length} of {employees.length} shown
          </span>
        </div>

        {/* ── EMPLOYEE TABLE ── */}
        <div style={mkCard(tint.cardBorder, { padding: 0, overflow: 'hidden' })}>
          {/* Table header bar */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${tint.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink }}>Employee Directory</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: rayColors.inkMuted }}>{employees.length} employee{employees.length !== 1 ? 's' : ''} in system</p>
            </div>
            {stats.noCreds > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 11, fontWeight: 600, color: rayColors.warning }}>
                <KeyRound size={11} />
                {stats.noCreds} employee{stats.noCreds !== 1 ? 's' : ''} need{stats.noCreds === 1 ? 's' : ''} credentials
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: rayColors.inkMuted }}>
              <div style={{ width: 24, height: 24, border: `2px solid ${rayColors.purple100}`, borderTopColor: rayColors.cyan500, borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ margin: 0, fontSize: 13 }}>Loading employees…</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: rayTypography.family }}>
                <thead>
                  <tr style={{ background: rayColors.purple50, borderBottom: `1px solid ${tint.cardBorder}` }}>
                    {['Employee', 'Designation', 'Department', 'Employee ID', 'Last access', 'Access', 'Credentials', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: rayColors.inkMuted, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: rayColors.inkMuted }}>
                        <Users size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.25 }} />
                        <p style={{ margin: 0, fontSize: 13 }}>{searchQuery ? 'No employees match your search.' : 'No employees yet. Add one to get started.'}</p>
                      </td>
                    </tr>
                  ) : filteredEmployees.map((emp, idx) => (
                    <tr key={emp.id} style={{ borderBottom: `1px solid ${tint.cardBorder}`, background: idx % 2 === 0 ? rayColors.white : rayColors.paper, transition: 'background 0.1s' }}>

                      {/* Employee name + email */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: rayColors.purple100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: rayColors.purple700 }}>
                              {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink }}>{emp.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: rayColors.cyan600 }}>{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Designation + experience */}
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ margin: 0, fontSize: 12, color: rayColors.inkMuted }}>{emp.designation}</p>
                        {emp.experience > 0 && <p style={{ margin: '2px 0 0', fontSize: 10, color: rayColors.inkMuted }}>{emp.experience} yr{emp.experience !== 1 ? 's' : ''}</p>}
                      </td>

                      {/* Department badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: rayColors.purple100, color: rayColors.purple700 }}>
                          <Building2 size={10} />{emp.department}
                        </span>
                      </td>

                      {/* Employee ID */}
                      <td style={{ padding: '12px 16px', fontSize: 11, color: rayColors.inkMuted, fontFamily: 'var(--font-mono)' }}>{emp.employeeId}</td>

                      {/* Last access */}
                      <td style={{ padding: '12px 16px' }}>
                        {emp.lastAccess ? (
                          <div>
                            <p style={{ margin: 0, fontSize: 11, color: rayColors.ink, fontWeight: 500 }}>{emp.lastAccess.time}</p>
                            <p style={{ margin: 0, fontSize: 10, color: rayColors.inkMuted }}>{emp.lastAccess.location}</p>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: rayColors.inkMuted }}>Never</span>
                        )}
                      </td>

                      {/* Access status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: emp.hasAccess ? '#dcfce7' : '#fee2e2', color: emp.hasAccess ? '#15803d' : '#b91c1c' }}>
                          {emp.hasAccess ? <ShieldCheck size={10} /> : <FileWarning size={10} />}
                          {emp.hasAccess ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Credentials status */}
                      <td style={{ padding: '12px 16px' }}>
                        {emp.credentialsCreated ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: rayColors.cyan50, color: rayColors.cyan600 }}>
                            <Check size={10} />Created
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#fffbeb', color: rayColors.warning, border: '1px solid #fde68a' }}>
                            <KeyRound size={10} />Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {/* Add Cred / Re-issue Cred button */}
                          <button
                            onClick={() => setCredModalEmployee(emp)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: rayTypography.family, transition: 'all 0.15s',
                              background: emp.credentialsCreated ? rayColors.purple50 : rayColors.cyan500,
                              color: emp.credentialsCreated ? rayColors.purple600 : rayColors.white,
                            }}
                            title={emp.credentialsCreated ? 'Re-issue credentials' : 'Create login credentials for this employee'}
                          >
                            <KeyRound size={11} />
                            {emp.credentialsCreated ? 'Re-issue' : 'Add Creds'}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => deleteEmployee(emp.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 8px', borderRadius: 7, border: `1px solid ${tint.cardBorder}`, background: rayColors.white, cursor: 'pointer', color: rayColors.danger }}
                            title="Delete employee"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── CREDENTIAL MODAL ── */}
      {credModalEmployee && (
        <CredentialModal
          employee={credModalEmployee}
          onClose={() => setCredModalEmployee(null)}
          onSuccess={(id) => { handleCredSuccess(id); setTimeout(() => setCredModalEmployee(null), 2000) }}
        />
      )}

      {/* ── IMPORT MODAL ── */}
      <EmployeeImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        existing={employees.map((e) => ({ email: e.email, employeeId: e.employeeId }))}
        onImport={handleImport}
      />

      {/* ── IMPORT TOAST ── */}
      {importedSummary && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: rayColors.white, border: `1px solid ${rayColors.borderMid}`, borderLeft: `3px solid ${rayColors.cyan500}`, borderRadius: 10, padding: '12px 16px', boxShadow: '0 8px 24px rgba(45,27,92,0.15)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 999, fontSize: 13, fontWeight: 500, color: rayColors.ink, fontFamily: rayTypography.family }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: rayColors.cyan500 }} />
          {importedSummary}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

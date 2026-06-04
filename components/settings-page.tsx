'use client'

import { useState } from 'react'
import {
  rayColors,
  rayTypography,
  getRayTint,
  inputStyle,
  buttonStyles,
} from '@/lib/design-system'
import {
  User,
  Bell,
  Moon,
  Shield,
  Bot,
  HelpCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Check,
  Camera,
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  Key,
  BarChart3,
  Users,
  AlertTriangle,
  Download,
  Trash2,
  Lock,
  Sliders,
  Activity,
  FileText,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingsPageProps {
  role?: 'admin' | 'executive' | 'employee'
  currentUser?: any
  onUserUpdate?: (updatedUser: any) => void
}

interface Settings {
  notifications: boolean
  emailDigest: boolean
  darkMode: boolean
  autoSave: boolean
  anonymizeData: boolean
  confidenceThreshold: number
  maxResults: number
  // Admin-only
  auditLogging: boolean
  maintenanceMode: boolean
  apiRateLimit: number
  // Executive-only
  executiveAlerts: boolean
  boardReports: boolean
  // Employee-only
  showMyTickets: boolean
  chatSuggestions: boolean
}

interface Profile {
  fullName: string
  email: string
  phone: string
  location: string
  department: string
  role: string
  bio: string
  company: string
}

// ---------------------------------------------------------------------------
// Shared page layout tokens
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
  padding: 20,
  ...extra,
})

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ color: rayColors.cyan500 }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: rayColors.ink }}>{label}</h2>
    </div>
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  border,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: () => void
  border: string
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 8, background: rayColors.paper, border: `1px solid ${border}`, gap: 12 }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: rayColors.inkMuted }}>{desc}</p>
      </div>
      <button
        onClick={onChange}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0,
          background: checked ? rayColors.cyan500 : rayColors.borderMid,
          position: 'relative', transition: 'background 0.2s',
        }}
        aria-checked={checked}
        role="switch"
      >
        <span style={{ position: 'absolute', top: 3, left: checked ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: rayColors.white, transition: 'left 0.2s' }} />
      </button>
    </div>
  )
}

function SliderRow({
  label,
  desc,
  value,
  min,
  max,
  step,
  format,
  onChange,
  accentColor,
}: {
  label: string
  desc: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
  accentColor?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ padding: '12px 14px', borderRadius: 8, background: rayColors.paper, border: `1px solid ${rayColors.borderSoft}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink }}>{label}</p>
        <span style={{ fontSize: 13, fontWeight: 700, color: accentColor || rayColors.cyan500 }}>
          {format ? format(value) : value}
        </span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: rayColors.inkMuted }}>{desc}</p>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: rayColors.borderMid }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: 6, borderRadius: 3, width: `${pct}%`, background: accentColor || rayColors.cyan500, transition: 'width 0.1s' }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 6 }}
        />
      </div>
    </div>
  )
}

function LinkRow({ label, desc, border }: { label: string; desc?: string; border: string }) {
  return (
    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 14px', borderRadius: 8, background: rayColors.paper, border: `1px solid ${border}`, cursor: 'pointer', fontFamily: rayTypography.family, textAlign: 'left', transition: 'border-color 0.15s' }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: rayColors.ink }}>{label}</p>
        {desc && <p style={{ margin: '2px 0 0', fontSize: 11, color: rayColors.inkMuted }}>{desc}</p>}
      </div>
      <ChevronRight size={15} style={{ color: rayColors.inkMuted, flexShrink: 0 }} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Profile panel — shared, customised per role
// ---------------------------------------------------------------------------

function ProfilePanel({ role, currentUser, border, onUserUpdate }: { role: string; currentUser: any; border: string; onUserUpdate?: (u: any) => void }) {
  const [profile, setProfile] = useState<Profile>({
    fullName: currentUser?.fullName || currentUser?.username || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    location: currentUser?.location || '',
    department: currentUser?.department || '',
    role: role,
    bio: currentUser?.bio || '',
    company: currentUser?.company || 'RAY Inc.',
  })
  const [saved, setSaved] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (profile.email?.[0] || '?').toUpperCase()

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'executive' ? 'Executive' : 'Employee'
  const avatarBg = role === 'admin' ? rayColors.purple200 : role === 'executive' ? rayColors.cyan100 : rayColors.purple100
  const avatarColor = role === 'admin' ? rayColors.purple700 : role === 'executive' ? rayColors.cyan700 : rayColors.purple600

  const handleSave = () => {
    // Build updated user object merging profile edits onto the existing user
    const updatedUser = {
      ...currentUser,
      fullName: profile.fullName,
      email: profile.email,
      department: profile.department,
      company: profile.company,
      // Store extra fields under a profile namespace so they don't clash
      // with the auth schema fields (phone, location, bio are UI-only)
      phone: profile.phone,
      location: profile.location,
      bio: profile.bio,
    }
    // Persist to localStorage so the session survives a page refresh
    if (typeof window !== 'undefined') {
      localStorage.setItem('ray_current_user', JSON.stringify(updatedUser))
    }
    // Bubble up to page.tsx so currentUser state updates immediately —
    // dashboard header, sidebar footer, and any other consumer re-renders
    onUserUpdate?.(updatedUser)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Avatar + role pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0 8px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${border}` }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: avatarColor }}>{initials}</span>
          </div>
          <button style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: rayColors.cyan500, border: `2px solid ${rayColors.white}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={11} style={{ color: rayColors.white }} />
          </button>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: rayColors.ink }}>{profile.fullName || 'Your Name'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', background: role === 'admin' ? rayColors.purple100 : role === 'executive' ? rayColors.cyan50 : rayColors.purple50, color: role === 'admin' ? rayColors.purple700 : role === 'executive' ? rayColors.cyan700 : rayColors.inkMuted }}>
              {roleLabel}
            </span>
            {profile.department && (
              <span style={{ fontSize: 11, color: rayColors.inkMuted }}>{profile.department}</span>
            )}
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { key: 'fullName', label: 'Full name', icon: <User size={13} />, type: 'text' },
          { key: 'email', label: 'Email address', icon: <Mail size={13} />, type: 'email' },
          { key: 'phone', label: 'Phone', icon: <Phone size={13} />, type: 'text' },
          { key: 'location', label: 'Location', icon: <MapPin size={13} />, type: 'text' },
          { key: 'department', label: 'Department', icon: <Building2 size={13} />, type: 'text' },
          { key: 'company', label: 'Company', icon: <Globe size={13} />, type: 'text' },
        ].map(({ key, label, icon, type }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: rayColors.inkMuted, textTransform: 'uppercase', letterSpacing: '0.7px', display: 'flex', alignItems: 'center', gap: 4 }}>
              {icon} {label}
            </label>
            <input
              type={type}
              value={(profile as any)[key]}
              onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      {/* Bio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: rayColors.inkMuted, textTransform: 'uppercase', letterSpacing: '0.7px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Briefcase size={13} /> Bio
        </label>
        <textarea
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          placeholder="A short bio about yourself…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: rayTypography.family }}
        />
      </div>

      {/* Change password */}
      <div>
        <button
          onClick={() => setShowPasswordForm((s) => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: `1px solid ${border}`, background: rayColors.white, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: rayColors.ink, fontFamily: rayTypography.family }}
        >
          <Key size={13} style={{ color: rayColors.cyan500 }} />
          Change password
          <ChevronRight size={13} style={{ color: rayColors.inkMuted, marginLeft: 'auto', transform: showPasswordForm ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {showPasswordForm && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', borderRadius: 8, background: rayColors.purple50, border: `1px solid ${border}` }}>
            {[
              { key: 'current', label: 'Current password' },
              { key: 'next', label: 'New password' },
              { key: 'confirm', label: 'Confirm new password' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: rayColors.inkMuted, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={(passwordForm as any)[key]}
                    onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                    style={{ ...inputStyle, paddingRight: 36 }}
                  />
                  <button onClick={() => setShowPwd((s) => !s)} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: rayColors.inkMuted, padding: 0 }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
            <button style={{ ...buttonStyles.primary, background: rayColors.cyan500, padding: '8px 16px', fontSize: 13, alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} /> Update password
            </button>
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
        <button
          onClick={handleSave}
          style={{ ...buttonStyles.primary, background: saved ? '#16a34a' : rayColors.cyan500, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', fontSize: 13, transition: 'background 0.2s', fontFamily: rayTypography.family }}
        >
          {saved ? <><Check size={14} />Saved!</> : <><Save size={14} />Save profile</>}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SettingsPage({ role = 'employee', currentUser, onUserUpdate }: SettingsPageProps) {
  const tint = getRayTint(role as any)

  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    emailDigest: true,
    darkMode: false,
    autoSave: true,
    anonymizeData: false,
    confidenceThreshold: 80,
    maxResults: 5,
    auditLogging: true,
    maintenanceMode: false,
    apiRateLimit: 1000,
    executiveAlerts: true,
    boardReports: false,
    showMyTickets: true,
    chatSuggestions: true,
  })

  const [settingsSaved, setSettingsSaved] = useState(false)

  const toggle = (key: keyof Settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }))
  const setNum = (key: keyof Settings, v: number) =>
    setSettings((s) => ({ ...s, [key]: v }))

  const saveSettings = () => {
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  // ── Role-specific section labels / role context ───────────────────────────
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'executive' ? 'Executive' : 'Employee'

  return (
    <div style={pageOuter(tint.pageBackground)}>
      <div style={innerWrap}>

        {/* ── PAGE HEADER ── */}
        <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingBottom: 18, borderBottom: `1px solid ${tint.cardBorder}` }}>
          <div>
            <h1 style={{ margin: '0 0 4px', ...rayTypography.h1 }}>Settings</h1>
            <p style={{ margin: 0, ...rayTypography.body }}>
              {role === 'admin'
                ? 'System configuration, user access controls, and your personal preferences.'
                : role === 'executive'
                ? 'Executive reporting preferences, alerts, and your personal profile.'
                : 'Your RAY preferences, notification settings, and personal profile.'}
            </p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.7px', background: role === 'admin' ? rayColors.purple100 : role === 'executive' ? rayColors.cyan50 : rayColors.purple50, color: role === 'admin' ? rayColors.purple700 : role === 'executive' ? rayColors.cyan700 : rayColors.inkMuted }}>
            {roleLabel} settings
          </div>
        </header>

        {/* ═══════════════════════════════════════
            SECTION 1 — PROFILE (all roles)
        ═══════════════════════════════════════ */}
        <div style={mkCard(tint.cardBorder)}>
          <SectionHeading icon={<User size={16} />} label="Profile" />
          <ProfilePanel role={role} currentUser={currentUser} border={tint.cardBorder} onUserUpdate={onUserUpdate} />
        </div>

        {/* ═══════════════════════════════════════
            SECTION 2 — NOTIFICATIONS (all roles, different copy)
        ═══════════════════════════════════════ */}
        <div style={mkCard(tint.cardBorder)}>
          <SectionHeading icon={<Bell size={16} />} label="Notifications" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ToggleRow label="In-app notifications" desc="Alerts for new queries, replies, and system events" checked={settings.notifications} onChange={() => toggle('notifications')} border={tint.cardBorder} />
            <ToggleRow label="Email digest" desc={role === 'executive' ? 'Daily executive summary sent to your inbox' : role === 'admin' ? 'Daily admin activity summary sent to your inbox' : 'Weekly summary of your RAY activity'} checked={settings.emailDigest} onChange={() => toggle('emailDigest')} border={tint.cardBorder} />
            {role === 'executive' && (
              <ToggleRow label="Executive alerts" desc="Immediate alerts for SLA breaches, critical incidents, and board items" checked={settings.executiveAlerts} onChange={() => toggle('executiveAlerts')} border={tint.cardBorder} />
            )}
            {role === 'admin' && (
              <ToggleRow label="System alerts" desc="Infrastructure warnings, failed jobs, and security events" checked={settings.auditLogging} onChange={() => toggle('auditLogging')} border={tint.cardBorder} />
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            SECTION 3 — RAY AI SETTINGS (all roles, different controls)
        ═══════════════════════════════════════ */}
        <div style={mkCard(tint.cardBorder)}>
          <SectionHeading icon={<Bot size={16} />} label="RAY AI preferences" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SliderRow label="Confidence threshold" desc="RAY only shows results above this confidence level" value={settings.confidenceThreshold} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => setNum('confidenceThreshold', v)} />
            <SliderRow label="Maximum results" desc="Number of sources displayed per response" value={settings.maxResults} min={1} max={10} step={1} onChange={(v) => setNum('maxResults', v)} />
            {role === 'employee' && (
              <ToggleRow label="Chat suggestions" desc="Show quick-reply suggestions below RAY's responses" checked={settings.chatSuggestions} onChange={() => toggle('chatSuggestions')} border={tint.cardBorder} />
            )}
            {role === 'employee' && (
              <ToggleRow label="Show my tickets" desc="Display my open tickets in the chat welcome screen" checked={settings.showMyTickets} onChange={() => toggle('showMyTickets')} border={tint.cardBorder} />
            )}
            {role === 'executive' && (
              <ToggleRow label="Board-ready reports" desc="Format RAY responses with executive summary structure" checked={settings.boardReports} onChange={() => toggle('boardReports')} border={tint.cardBorder} />
            )}
            {role === 'admin' && (
              <SliderRow label="API rate limit" desc="Maximum API requests per minute from all clients" value={settings.apiRateLimit} min={100} max={5000} step={100} format={(v) => `${v}/min`} onChange={(v) => setNum('apiRateLimit', v)} accentColor={rayColors.purple500} />
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            SECTION 4A — ADMIN: System settings
        ═══════════════════════════════════════ */}
        {role === 'admin' && (
          <div style={mkCard(tint.cardBorder)}>
            <SectionHeading icon={<Sliders size={16} />} label="System settings" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ToggleRow label="Audit logging" desc="Record all user actions and system events to the audit log" checked={settings.auditLogging} onChange={() => toggle('auditLogging')} border={tint.cardBorder} />
              <ToggleRow label="Anonymize query data" desc="Strip PII from chatbot analytics before storage" checked={settings.anonymizeData} onChange={() => toggle('anonymizeData')} border={tint.cardBorder} />
              <ToggleRow label="Maintenance mode" desc="Temporarily restrict access to admins only while performing updates" checked={settings.maintenanceMode} onChange={() => toggle('maintenanceMode')} border={tint.cardBorder} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <LinkRow label="Manage integrations" desc="Configure Slack, email, and third-party connections" border={tint.cardBorder} />
                <LinkRow label="Export system data" desc="Download full audit log, user list, and analytics" border={tint.cardBorder} />
                <LinkRow label="Backup & restore" desc="Schedule automated backups and restore from snapshots" border={tint.cardBorder} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            SECTION 4B — EXECUTIVE: Reporting settings
        ═══════════════════════════════════════ */}
        {role === 'executive' && (
          <div style={mkCard(tint.cardBorder)}>
            <SectionHeading icon={<BarChart3 size={16} />} label="Reporting preferences" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ToggleRow label="Board-ready reports" desc="Auto-format dashboards with executive summary sections" checked={settings.boardReports} onChange={() => toggle('boardReports')} border={tint.cardBorder} />
              <ToggleRow label="Anonymize employee data" desc="Aggregate-only views — no individual employee tracking" checked={settings.anonymizeData} onChange={() => toggle('anonymizeData')} border={tint.cardBorder} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <LinkRow label="Download executive summary" desc="PDF of this month's KPIs and risk analysis" border={tint.cardBorder} />
                <LinkRow label="Schedule board report" desc="Set up automatic quarterly report delivery" border={tint.cardBorder} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            SECTION 4C — EMPLOYEE: Personal preferences
        ═══════════════════════════════════════ */}
        {role === 'employee' && (
          <div style={mkCard(tint.cardBorder)}>
            <SectionHeading icon={<Activity size={16} />} label="Personal preferences" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ToggleRow label="Auto-save chats" desc="Automatically save your chat history for future reference" checked={settings.autoSave} onChange={() => toggle('autoSave')} border={tint.cardBorder} />
              <ToggleRow label="Dark mode" desc="Use the dark theme across all RAY screens" checked={settings.darkMode} onChange={() => toggle('darkMode')} border={tint.cardBorder} />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            SECTION 5 — PRIVACY & SECURITY (all roles)
        ═══════════════════════════════════════ */}
        <div style={mkCard(tint.cardBorder)}>
          <SectionHeading icon={<Shield size={16} />} label="Privacy & security" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ToggleRow label="Anonymize my data" desc="Remove personally identifiable information from analytics logs" checked={settings.anonymizeData} onChange={() => toggle('anonymizeData')} border={tint.cardBorder} />
            <LinkRow label="Two-factor authentication" desc="Add an extra layer of security to your account" border={tint.cardBorder} />
            <LinkRow label="Active sessions" desc="View and revoke sessions on other devices" border={tint.cardBorder} />
            {role !== 'employee' && (
              <LinkRow label="API access tokens" desc="Generate and manage personal API keys" border={tint.cardBorder} />
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            SECTION 6 — SUPPORT & ABOUT (all roles)
        ═══════════════════════════════════════ */}
        <div style={mkCard(tint.cardBorder)}>
          <SectionHeading icon={<HelpCircle size={16} />} label="Support & about" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LinkRow label="Documentation" desc="Read the RAY user guide and API reference" border={tint.cardBorder} />
            <LinkRow label="Contact support" desc="Raise a ticket with the RAY support team" border={tint.cardBorder} />
            <LinkRow label="About RAY v1.0" desc="Powered by Vexar Tech · Build 2024.06" border={tint.cardBorder} />
            {role === 'admin' && (
              <LinkRow label="System status" desc="View current service health and incident history" border={tint.cardBorder} />
            )}
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button
            onClick={saveSettings}
            style={{ ...buttonStyles.primary, flex: 1, background: settingsSaved ? '#16a34a' : rayColors.cyan500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 20px', fontSize: 13, transition: 'background 0.2s', fontFamily: rayTypography.family }}
          >
            {settingsSaved ? <><Check size={14} />Settings saved!</> : <><Save size={14} />Save settings</>}
          </button>
          <button
            style={{ ...buttonStyles.secondary, flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 20px', fontSize: 13, fontFamily: rayTypography.family }}
            onClick={() => setSettings({ notifications: true, emailDigest: true, darkMode: false, autoSave: true, anonymizeData: false, confidenceThreshold: 80, maxResults: 5, auditLogging: true, maintenanceMode: false, apiRateLimit: 1000, executiveAlerts: true, boardReports: false, showMyTickets: true, chatSuggestions: true })}
          >
            <RotateCcw size={14} /> Reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

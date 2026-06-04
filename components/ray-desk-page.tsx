'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Ticket, TicketStatus, TicketPriority } from '@/lib/ticket-types'
import { sampleTickets, executiveDemoTickets, johnSmithDemoTickets } from '@/lib/sample-data'
import { DEPARTMENTS } from '@/lib/departments'
import {
  unifiedTheme,
  cardStyle,
  buttonStyles,
  inputStyle,
  badgeStyle,
  rayColors,
  rayTypography,
  getRayTint,
} from '@/lib/design-system'
import {
  Plus,
  X,
  Search,
  Inbox,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  AlertCircle,
  ChevronDown,
  User,
  Building2,
  Calendar,
  Tag,
  MessageSquare,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react'

interface RayDeskPageProps {
  currentUser?: any
}

// ─── Shared page layout helpers (matches dashboard-page.tsx) ─────────────

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

// ─── Shared StatCard (identical shape to dashboard-page StatCard) ─────────

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
      {/* Top colour strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: stripColor,
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: rayColors.inkMuted,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 24,
          fontWeight: 600,
          color: valueColor || rayColors.ink,
          letterSpacing: '-0.3px',
        }}
      >
        {value}
        {sub && (
          <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500, color: rayColors.inkMuted }}>
            · {sub}
          </span>
        )}
      </p>
    </div>
  )
}

// ─── Page section header (matches dashboard sectionHeader style) ──────────

function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  border,
}: {
  title: string
  subtitle: string
  badge?: string
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1
            style={{
              margin: 0,
              ...rayTypography.h1,
            }}
          >
            {title}
          </h1>
          {badge && (
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 999,
                background: rayColors.purple50,
                color: rayColors.inkMuted,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p style={{ margin: 0, ...rayTypography.body }}>{subtitle}</p>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>
      )}
    </header>
  )
}

// ─── Visual helpers ────────────────────────────────────────────────────────

const statusMeta: Record<
  TicketStatus,
  { label: string; bg: string; fg: string; icon: React.ReactNode; dot: string }
> = {
  open: {
    label: 'Open',
    bg: '#fff7ed',
    fg: '#9a3412',
    dot: '#f97316',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  'in-progress': {
    label: 'In progress',
    bg: '#eff6ff',
    fg: '#1d4ed8',
    dot: '#3b82f6',
    icon: <Clock className="h-3 w-3" />,
  },
  'on-hold': {
    label: 'On hold',
    bg: '#fefce8',
    fg: '#854d0e',
    dot: '#eab308',
    icon: <Pause className="h-3 w-3" />,
  },
  closed: {
    label: 'Closed',
    bg: '#f0fdf4',
    fg: '#166534',
    dot: '#22c55e',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

const priorityMeta: Record<TicketPriority, { label: string; bg: string; fg: string }> = {
  low: { label: 'Low', bg: '#f1f5f9', fg: '#475569' },
  medium: { label: 'Medium', bg: '#eff6ff', fg: '#1d4ed8' },
  high: { label: 'High', bg: '#fff7ed', fg: '#9a3412' },
  critical: { label: 'Critical', bg: '#fee2e2', fg: '#991b1b' },
}

function formatRelative(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const m = statusMeta[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: m.bg,
        color: m.fg,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {m.icon}
      {m.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const m = priorityMeta[priority]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 6,
        background: m.bg,
        color: m.fg,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}
    >
      {m.label}
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export function RayDeskPage({ currentUser }: RayDeskPageProps = {}) {
  const role = currentUser?.role || 'admin'
  const tint = getRayTint(role)

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: 'IT Support',
    priority: 'medium' as TicketPriority,
    assignee: '',
  })
  const detailScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentUser) { setTickets(sampleTickets); return }
    if (currentUser.role === 'executive') setTickets(executiveDemoTickets)
    else if (currentUser.role === 'employee' && currentUser.username === 'john.smith') setTickets(johnSmithDemoTickets)
    else setTickets(sampleTickets)
  }, [currentUser])

  const visibleTickets = useMemo(() => {
    if (currentUser?.role === 'employee') {
      const lowerNames = [currentUser.username, currentUser.fullName]
        .filter(Boolean)
        .map((name: string) => name.toLowerCase())
      return tickets.filter((t) => {
        const assigneeMatch = t.assignee ? lowerNames.includes(t.assignee.toLowerCase()) : false
        return assigneeMatch || t.createdBy === currentUser.username
      })
    }
    return tickets
  }, [tickets, currentUser])

  const departments = useMemo(() => ['all', ...DEPARTMENTS], [])

  const filtered = useMemo(() => {
    return visibleTickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (departmentFilter !== 'all' && t.department !== departmentFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hay = `${t.title} ${t.description} ${t.id} ${t.assignee ?? ''} ${t.createdBy ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [visibleTickets, statusFilter, priorityFilter, departmentFilter, searchQuery])

  const stats = useMemo(() => ({
    total: visibleTickets.length,
    open: visibleTickets.filter((t) => t.status === 'open').length,
    inProgress: visibleTickets.filter((t) => t.status === 'in-progress').length,
    highPriority: visibleTickets.filter((t) => t.priority === 'high' || t.priority === 'critical').length,
    closed: visibleTickets.filter((t) => t.status === 'closed').length,
  }), [visibleTickets])

  useEffect(() => {
    if (filtered.length === 0) setSelectedId(null)
    else if (!selectedId || !filtered.find((t) => t.id === selectedId)) setSelectedId(filtered[0].id)
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0
  }, [filtered, selectedId])

  const selected = filtered.find((t) => t.id === selectedId) ?? null
  const canEditTicket = (ticket: Ticket) => currentUser?.role === 'admin' || ticket.createdBy === currentUser?.username

  const handleCreateTicket = () => {
    if (!formData.title.trim()) return
    const newTicket: Ticket = {
      id: `T${String(tickets.length + 1).padStart(4, '0')}`,
      title: formData.title,
      description: formData.description,
      status: 'open',
      priority: formData.priority,
      department: formData.department,
      assignee: formData.assignee || undefined,
      createdBy: currentUser?.username || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTickets([newTicket, ...tickets])
    setSelectedId(newTicket.id)
    setShowCreateForm(false)
    setFormData({ title: '', description: '', department: 'IT Support', priority: 'medium', assignee: '' })
  }

  const handleStatusChange = (id: string, status: TicketStatus) =>
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date() } : t)))

  const handlePriorityChange = (id: string, priority: TicketPriority) =>
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, priority, updatedAt: new Date() } : t)))

  const clearFilters = () => { setStatusFilter('all'); setPriorityFilter('all'); setDepartmentFilter('all'); setSearchQuery('') }

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || departmentFilter !== 'all' || searchQuery.trim() !== ''

  return (
    <div style={pageOuter(tint.pageBackground)}>
      <div style={innerWrap}>

        {/* ─── PAGE HEADER ─── */}
        <PageHeader
          title="RAY Desk"
          subtitle="Unified support ticketing across departments — track, assign, and resolve in one place."
          badge={`${filtered.length} of ${visibleTickets.length}`}
          border={tint.cardBorder}
          actions={
            <>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, color: rayColors.inkMuted, pointerEvents: 'none' }} />
                <input
                  placeholder="Search tickets by title, ID, assignee…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, width: 300, paddingLeft: 36 }}
                />
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{ ...buttonStyles.primary, background: rayColors.cyan500, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={16} /> New Ticket
              </button>
            </>
          }
        />

        {/* ─── STAT STRIP (4-col, matches dashboard StatCard) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <StatCard label="Total tickets" value={stats.total.toString()} stripColor={rayColors.inkSoft} border={tint.cardBorder} />
          <StatCard label="Open" value={stats.open.toString()} stripColor="#f97316" border={tint.cardBorder} />
          <StatCard label="In progress" value={stats.inProgress.toString()} stripColor="#3b82f6" border={tint.cardBorder} />
          <StatCard label="High priority" value={stats.highPriority.toString()} stripColor={rayColors.danger} border={tint.cardBorder} valueColor={stats.highPriority > 0 ? rayColors.danger : undefined} />
          <StatCard label="Closed" value={stats.closed.toString()} stripColor={rayColors.cyan500} border={tint.cardBorder} />
        </div>

        {/* ─── FILTER BAR ─── */}
        <div style={mkCard(tint.cardBorder, { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: rayColors.inkMuted }}>
            <Filter size={14} />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Filters</span>
          </div>
          <FilterGroup value={statusFilter} onChange={(v) => setStatusFilter(v as TicketStatus | 'all')} options={[{ value: 'all', label: 'All status' }, { value: 'open', label: 'Open' }, { value: 'in-progress', label: 'In progress' }, { value: 'on-hold', label: 'On hold' }, { value: 'closed', label: 'Closed' }]} />
          <FilterGroup value={priorityFilter} onChange={(v) => setPriorityFilter(v as TicketPriority | 'all')} options={[{ value: 'all', label: 'All priority' }, { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
          <FilterGroup value={departmentFilter} onChange={setDepartmentFilter} options={departments.map((d) => ({ value: d, label: d === 'all' ? 'All departments' : d }))} />
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: rayColors.cyan500, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={13} /> Clear filters
            </button>
          )}
        </div>

        {/* ─── MASTER / DETAIL ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 420px) 1fr', gap: 16, alignItems: 'stretch' }}>
          <div style={mkCard(tint.cardBorder, { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 720 })}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${tint.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: rayColors.inkMuted }}>Tickets</span>
              <span style={{ fontSize: 12, color: rayColors.inkMuted }}>{filtered.length} shown</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? <EmptyList /> : filtered.map((t) => (
                <TicketRow key={t.id} ticket={t} selected={t.id === selectedId} onSelect={() => setSelectedId(t.id)} tint={tint} />
              ))}
            </div>
          </div>
          <div ref={detailScrollRef} style={mkCard(tint.cardBorder, { padding: 0, overflowY: 'auto', maxHeight: 720 })}>
            {selected ? (
              <TicketDetail ticket={selected} canEdit={canEditTicket(selected)} onStatusChange={(s) => handleStatusChange(selected.id, s)} onPriorityChange={(p) => handlePriorityChange(selected.id, p)} tint={tint} />
            ) : (
              <EmptyDetail />
            )}
          </div>
        </div>
      </div>

      {showCreateForm && (
        <CreateTicketModal formData={formData} setFormData={setFormData} onClose={() => setShowCreateForm(false)} onSubmit={handleCreateTicket} />
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FilterGroup<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} style={{ ...inputStyle, padding: '8px 30px 8px 12px', fontSize: 13, fontWeight: 600, width: 'auto', appearance: 'none', cursor: 'pointer' }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: rayColors.inkMuted }} />
    </div>
  )
}

function TicketRow({ ticket, selected, onSelect, tint }: { ticket: Ticket; selected: boolean; onSelect: () => void; tint: ReturnType<typeof getRayTint> }) {
  const m = statusMeta[ticket.status]
  return (
    <button onClick={onSelect} style={{ display: 'block', width: '100%', textAlign: 'left', background: selected ? rayColors.purple50 : 'transparent', border: 'none', borderLeft: selected ? `3px solid ${rayColors.cyan500}` : '3px solid transparent', padding: '14px 18px', borderBottom: `1px solid ${tint.cardBorder}`, cursor: 'pointer', transition: 'background 0.1s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: m.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: rayColors.inkMuted, letterSpacing: 0.3 }}>{ticket.id}</span>
        </div>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: rayColors.ink, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: rayColors.inkMuted }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={11} />{ticket.department}</span>
        <span>•</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{formatRelative(ticket.updatedAt)}</span>
      </div>
    </button>
  )
}

function TicketDetail({ ticket, canEdit, onStatusChange, onPriorityChange, tint }: { ticket: Ticket; canEdit: boolean; onStatusChange: (s: TicketStatus) => void; onPriorityChange: (p: TicketPriority) => void; tint: ReturnType<typeof getRayTint> }) {
  return (
    <div>
      <div style={{ padding: '22px 28px', borderBottom: `1px solid ${tint.cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: rayColors.inkMuted, letterSpacing: 0.5 }}>{ticket.id}</span>
          <span style={{ color: rayColors.inkMuted }}>·</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: rayColors.ink, lineHeight: 1.3 }}>{ticket.title}</h2>
      </div>
      {canEdit && (
        <div style={{ padding: '14px 28px', display: 'flex', gap: 10, flexWrap: 'wrap', background: rayColors.purple50, borderBottom: `1px solid ${tint.cardBorder}` }}>
          <ActionDropdown label="Change status" value={ticket.status} options={[{ value: 'open', label: 'Open' }, { value: 'in-progress', label: 'In progress' }, { value: 'on-hold', label: 'On hold' }, { value: 'closed', label: 'Closed' }]} onChange={(v) => onStatusChange(v as TicketStatus)} />
          <ActionDropdown label="Change priority" value={ticket.priority} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} onChange={(v) => onPriorityChange(v as TicketPriority)} />
        </div>
      )}
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 32 }}>
        <div>
          <SectionLabel icon={<MessageSquare size={14} />} text="Description" />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: rayColors.inkMuted, whiteSpace: 'pre-wrap' }}>
            {ticket.description || <em style={{ color: rayColors.inkMuted }}>No description provided.</em>}
          </p>
          {ticket.resolutionNotes && (
            <div style={{ marginTop: 24 }}>
              <SectionLabel icon={<CheckCircle2 size={14} />} text="Resolution notes" />
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, fontSize: 13, color: '#166534', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.resolutionNotes}</div>
            </div>
          )}
        </div>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, borderLeft: `1px solid ${tint.cardBorder}`, paddingLeft: 24 }}>
          <MetaRow icon={<User size={14} />} label="Assignee" value={ticket.assignee || 'Unassigned'} />
          <MetaRow icon={<User size={14} />} label="Reporter" value={ticket.createdBy || '—'} />
          <MetaRow icon={<Building2 size={14} />} label="Department" value={ticket.department} />
          <MetaRow icon={<Tag size={14} />} label="Priority" value={priorityMeta[ticket.priority].label} />
          <MetaRow icon={<Calendar size={14} />} label="Created" value={new Date(ticket.createdAt).toLocaleString()} />
          <MetaRow icon={<Clock size={14} />} label="Last update" value={formatRelative(ticket.updatedAt)} />
        </aside>
      </div>
    </div>
  )
}

function ActionDropdown<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: rayColors.inkMuted }}>{label}:</span>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={(e) => onChange(e.target.value as T)} style={{ ...inputStyle, padding: '6px 28px 6px 10px', fontSize: 13, fontWeight: 600, width: 'auto', appearance: 'none', cursor: 'pointer', background: '#fff' }}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: rayColors.inkMuted }} />
      </div>
    </div>
  )
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: rayColors.inkMuted }}>
      {icon}
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{text}</span>
    </div>
  )
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: rayColors.inkMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {icon}{label}
      </span>
      <span style={{ fontSize: 13, color: rayColors.ink, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function EmptyList() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: rayColors.inkMuted, fontSize: 13 }}>
      <Inbox size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
      <p style={{ margin: 0 }}>No tickets match your filters.</p>
    </div>
  )
}

function EmptyDetail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 360, color: rayColors.inkMuted, padding: 40, textAlign: 'center' }}>
      <ArrowUpRight size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
      <p style={{ margin: 0, fontSize: 14 }}>Select a ticket on the left to see its details.</p>
    </div>
  )
}

function CreateTicketModal({ formData, setFormData, onClose, onSubmit }: { formData: { title: string; description: string; department: string; priority: TicketPriority; assignee: string }; setFormData: React.Dispatch<React.SetStateAction<any>>; onClose: () => void; onSubmit: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, boxShadow: '0 24px 80px rgba(15,23,42,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, ...rayTypography.h2 }}>Create new ticket</h3>
            <p style={{ margin: '4px 0 0', ...rayTypography.body }}>Fill in the details below to open a support request.</p>
          </div>
          <button onClick={onClose} style={{ background: rayColors.purple50, border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: rayColors.inkMuted }} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Title"><input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Brief summary of the issue" style={inputStyle} /></Field>
          <Field label="Description"><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the problem, steps to reproduce, and any error messages" rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Department">
              <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={inputStyle}>
                {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })} style={inputStyle}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </Field>
          </div>
          <Field label="Assignee (optional)"><input value={formData.assignee} onChange={(e) => setFormData({ ...formData, assignee: e.target.value })} placeholder="Username to assign to" style={inputStyle} /></Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${rayColors.borderSoft}` }}>
          <button onClick={onClose} style={buttonStyles.secondary}>Cancel</button>
          <button onClick={onSubmit} disabled={!formData.title.trim()} style={{ ...buttonStyles.primary, background: rayColors.cyan500, display: 'flex', alignItems: 'center', gap: 8, opacity: formData.title.trim() ? 1 : 0.5, cursor: formData.title.trim() ? 'pointer' : 'not-allowed' }}>Create ticket</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: rayColors.inkMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
      {children}
    </label>
  )
}

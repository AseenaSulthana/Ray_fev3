'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Search,
  Download,
  ChevronDown,
  X,
  CheckCircle,
  XCircle,
  Shield,
  Users,
  Activity,
  Brain,
  ChevronRight,
  Filter,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Data ──────────────────────────────────────────────────────────────────

const activityData = [
  { day: 'Mon', logins: 42, updates: 28, deletes: 5, exports: 8 },
  { day: 'Tue', logins: 38, updates: 32, deletes: 3, exports: 12 },
  { day: 'Wed', logins: 55, updates: 41, deletes: 7, exports: 9 },
  { day: 'Thu', logins: 61, updates: 38, deletes: 4, exports: 15 },
  { day: 'Fri', logins: 48, updates: 29, deletes: 6, exports: 11 },
  { day: 'Sat', logins: 18, updates: 12, deletes: 1, exports: 3 },
  { day: 'Sun', logins: 14, updates: 8, deletes: 1, exports: 2 },
]

const dailyLogVolume = [
  { date: 'Jun 13', logs: 780 },
  { date: 'Jun 14', logs: 820 },
  { date: 'Jun 15', logs: 910 },
  { date: 'Jun 16', logs: 860 },
  { date: 'Jun 17', logs: 940 },
  { date: 'Jun 18', logs: 720 },
  { date: 'Jun 19', logs: 850 },
]

const auditLogs = [
  { timestamp: 'Jun 19, 2024 14:32', user: 'admin@company.com', action: 'User Login', resource: 'Authentication', status: 'Success', details: 'From 192.168.1.100' },
  { timestamp: 'Jun 19, 2024 14:15', user: 'john.doe@company.com', action: 'Update Profile', resource: 'User #1234', status: 'Success', details: 'Changed email address' },
  { timestamp: 'Jun 19, 2024 13:45', user: 'system', action: 'Backup Completed', resource: 'Database', status: 'Success', details: '2.4 GB backed up' },
  { timestamp: 'Jun 19, 2024 13:22', user: 'admin@company.com', action: 'Create Role', resource: 'Roles', status: 'Success', details: 'Created "Analyst" role' },
  { timestamp: 'Jun 19, 2024 12:55', user: 'sarah.smith@company.com', action: 'Export Data', resource: 'Reports #567', status: 'Success', details: 'CSV, 1500 records' },
  { timestamp: 'Jun 19, 2024 12:30', user: 'admin@company.com', action: 'Delete User', resource: 'User #5678', status: 'Success', details: 'Inactive user removed' },
  { timestamp: 'Jun 19, 2024 11:45', user: 'mike.johnson@company.com', action: 'Access Denied', resource: 'Admin Panel', status: 'Failed', details: 'Insufficient permissions' },
  { timestamp: 'Jun 19, 2024 11:22', user: 'system', action: 'API Call', resource: '/api/reports', status: 'Success', details: 'Response: 245ms' },
]

const aiAuditInsights = [
  { title: 'Unusual export pattern', description: 'sarah.smith exported 1,500+ records at 12:55 PM — 3× her weekly average. Review if intentional.', severity: 'medium', action: 'Investigate' },
  { title: 'Access denied spike', description: '3 access-denied events in the last hour from mike.johnson. May indicate a permission misconfiguration.', severity: 'high', action: 'Fix permissions' },
  { title: 'Admin activity healthy', description: 'All admin actions in the last 24h follow normal patterns. No anomalies detected.', severity: 'success', action: 'View report' },
]

const kpiCards = [
  { label: 'Total logs (30d)', value: '24,582', trend: '+8%', up: true, icon: Activity, color: 'cyan' },
  { label: 'Success rate', value: '99.8%', trend: '+0.1%', up: true, icon: CheckCircle, color: 'emerald' },
  { label: 'Active users logged', value: '287', trend: '+12%', up: true, icon: Users, color: 'cyan' },
  { label: 'Failed events', value: '49', trend: '-18%', up: true, icon: Shield, color: 'emerald' },
]

const colorMap: Record<string, string> = {
  cyan: 'from-cyan-50 to-cyan-100/50 dark:from-cyan-950/20 dark:to-cyan-900/10 text-cyan-700 dark:text-cyan-400',
  emerald: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-emerald-700 dark:text-emerald-400',
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AuditLogs() {
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState('All Users')
  const [actionFilter, setActionFilter] = useState('All Actions')

  const filtered = auditLogs.filter((log) => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${log.user} ${log.action} ${log.resource} ${log.details}`.toLowerCase().includes(q)
    const matchUser = userFilter === 'All Users' || (userFilter === 'Admin Users' && log.user.includes('admin')) || (userFilter === 'System' && log.user === 'system')
    const matchAction = actionFilter === 'All Actions' || log.action.toLowerCase().includes(actionFilter.toLowerCase())
    return matchSearch && matchUser && matchAction
  })

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-cyan-50 via-white to-cyan-100 dark:from-cyan-950/90 dark:via-slate-950 dark:to-slate-950 p-8 space-y-8">

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">Complete activity history, compliance tracking, and anomaly detection</p>
          </div>
          <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700 flex-shrink-0">
            <Download className="h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* KPI ribbon */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => {
            const Icon = card.icon
            return (
              <Card key={i} className={`p-6 border-0 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 bg-gradient-to-br ${colorMap[card.color]}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
                    <p className="text-3xl font-bold mt-2">{card.value}</p>
                  </div>
                  <Icon className="h-8 w-8 opacity-40" />
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">{card.trend}</span>
                  <span className="text-xs opacity-70">vs last period</span>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* AI Insights */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 mb-4">AI Audit Intelligence</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiAuditInsights.map((insight, idx) => (
            <Card key={idx} className="p-6 border-0 shadow-sm hover:shadow-md transition-all bg-cyan-50/90 dark:bg-cyan-950/80">
              <div className="flex items-start gap-3 mb-3">
                <Brain className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{insight.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{insight.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  insight.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : insight.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
                </span>
                <Button variant="ghost" size="sm" className="gap-1 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20">
                  {insight.action} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-4">Activity breakdown by day</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="day" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="logins" fill="#06b6d4" name="Logins" radius={[4, 4, 0, 0]} />
              <Bar dataKey="updates" fill="#8b5cf6" name="Updates" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deletes" fill="#ef4444" name="Deletes" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exports" fill="#10b981" name="Exports" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-4">Log volume trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyLogVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="date" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="logs" fill="#06b6d4" stroke="#06b6d4" fillOpacity={0.25} name="Log entries" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Search + filter bar */}
      <div className="max-w-7xl mx-auto">
        <Card className="p-4 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative flex items-center">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search logs by user, action, or resource…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-600 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {[
              { value: userFilter, onChange: setUserFilter, options: ['All Users', 'Admin Users', 'System', 'API'] },
              { value: actionFilter, onChange: setActionFilter, options: ['All Actions', 'Login', 'Create', 'Update', 'Delete', 'Export', 'Access Denied'] },
            ].map((sel, i) => (
              <div key={i} className="relative">
                <select
                  value={sel.value}
                  onChange={(e) => sel.onChange(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-600 cursor-pointer transition-colors"
                >
                  {sel.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ))}
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-auto">{filtered.length} entries</span>
          </div>
        </Card>
      </div>

      {/* Audit table */}
      <div className="max-w-7xl mx-auto">
        <Card className="border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100">Recent activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/30">
                  {['Timestamp', 'User', 'Action', 'Resource', 'Status', 'Details'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-white/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3.5 px-4 text-sm text-slate-900 dark:text-white font-medium max-w-[160px]">
                      <span className="truncate block">{log.user}</span>
                    </td>
                    <td className="py-3.5 px-4 text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">{log.action}</td>
                    <td className="py-3.5 px-4 text-sm text-slate-600 dark:text-slate-300">{log.resource}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        log.status === 'Success'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {log.status === 'Success'
                          ? <CheckCircle className="h-3 w-3" />
                          : <XCircle className="h-3 w-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-[140px]">
                      <span className="truncate block">{log.details}</span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No log entries match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  )
}

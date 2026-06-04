'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Shield,
  Brain,
  ChevronRight,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Data ──────────────────────────────────────────────────────────────────

const alertTrendData = [
  { week: 'W1', critical: 4, high: 9, medium: 14, resolved: 22 },
  { week: 'W2', critical: 6, high: 11, medium: 18, resolved: 28 },
  { week: 'W3', critical: 3, high: 8, medium: 12, resolved: 19 },
  { week: 'W4', critical: 3, high: 7, medium: 12, resolved: 28 },
]

const riskScoreData = [
  { day: 'Mon', score: 68 },
  { day: 'Tue', score: 72 },
  { day: 'Wed', score: 65 },
  { day: 'Thu', score: 78 },
  { day: 'Fri', score: 71 },
  { day: 'Sat', score: 64 },
  { day: 'Sun', score: 69 },
]

const criticalAlerts = [
  { title: 'Database connection pool exhausted', time: '15 minutes ago', dept: 'Infrastructure' },
  { title: 'Memory usage at 94% on Server-03', time: '32 minutes ago', dept: 'Infrastructure' },
  { title: 'SSL certificate expires in 7 days', time: '2 hours ago', dept: 'Security' },
]

const highAlerts = [
  { title: 'Unusual login attempts detected — 15 failed attempts', time: '1 hour ago', dept: 'Security' },
  { title: 'API response time degradation detected', time: '3 hours ago', dept: 'Engineering' },
  { title: 'Backup job failed — disk space issue', time: '5 hours ago', dept: 'Infrastructure' },
  { title: 'Third-party service integration error', time: '6 hours ago', dept: 'Engineering' },
]

const riskAreas = [
  { area: 'Security', score: 72, status: 'Good' },
  { area: 'Performance', score: 65, status: 'Fair' },
  { area: 'Data Integrity', score: 88, status: 'Excellent' },
  { area: 'Compliance', score: 79, status: 'Good' },
  { area: 'Availability', score: 94, status: 'Excellent' },
]

const aiRiskInsights = [
  { title: 'Security posture degraded', description: 'Multiple failed login attempts suggest a coordinated brute-force attempt. Recommend IP block.', severity: 'high', action: 'Block IPs' },
  { title: 'Storage risk escalating', description: 'At current growth rate, storage will reach 90% within 12 days. Plan upgrade or cleanup.', severity: 'medium', action: 'Plan' },
  { title: 'SLA compliance improving', description: 'Finance dept resolved backlog — SLA compliance up 4% this week. Replicate best practices.', severity: 'success', action: 'Learn' },
  { title: 'Certificate expiry window', description: '3 SSL certificates expire within 30 days. Auto-renewal not configured for 2 of them.', severity: 'medium', action: 'Renew' },
]

const kpiCards = [
  { label: 'Critical', value: '3', trend: '-25%', up: true, color: 'red' },
  { label: 'High priority', value: '7', trend: '-13%', up: true, color: 'amber' },
  { label: 'Medium', value: '12', trend: '+9%', up: false, color: 'cyan' },
  { label: 'Resolved (period)', value: '28', trend: '+17%', up: true, color: 'emerald' },
]

const cardColorMap: Record<string, string> = {
  red: 'from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 text-red-700 dark:text-red-400',
  amber: 'from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 text-amber-700 dark:text-amber-400',
  cyan: 'from-cyan-50 to-cyan-100/50 dark:from-cyan-950/20 dark:to-cyan-900/10 text-cyan-700 dark:text-cyan-400',
  emerald: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-emerald-700 dark:text-emerald-400',
}

export function AlertsRisks() {
  const [activeView, setActiveView] = useState<'all' | 'critical' | 'high'>('all')

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-cyan-50 via-white to-cyan-100 dark:from-cyan-950/90 dark:via-slate-950 dark:to-slate-950 p-8 space-y-8">

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Alerts & Risk Center</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">AI-monitored system risks, security events, and compliance health</p>
          </div>
          <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700 flex-shrink-0">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI ribbon */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <Card key={i} className={`p-6 border-0 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 bg-gradient-to-br ${cardColorMap[card.color]}`}>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
                <p className="text-3xl font-bold mt-2">{card.value}</p>
              </div>
              <div className="flex items-center gap-2">
                {card.up ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                <span className={`text-sm font-semibold ${card.up ? 'text-green-600' : 'text-red-600'}`}>{card.trend}</span>
                <span className="text-xs opacity-70">vs last period</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Risk Insights */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 mb-4">AI Risk Intelligence</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiRiskInsights.map((insight, idx) => (
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
                  {insight.action}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-4">Alert volume by week</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={alertTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="week" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="critical" fill="#ef4444" name="Critical" radius={[4, 4, 0, 0]} />
              <Bar dataKey="high" fill="#f59e0b" name="High" radius={[4, 4, 0, 0]} />
              <Bar dataKey="medium" fill="#06b6d4" name="Medium" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-4">Risk score trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={riskScoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="day" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <YAxis domain={[50, 100]} stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} name="Risk score" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">Higher = safer. Target ≥ 75</p>
            <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mt-0.5">Current: <span className="text-amber-600 dark:text-amber-400">69</span> — Fair</p>
          </div>
        </Card>
      </div>

      {/* Critical alerts */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">Critical alerts</h2>
          <Button variant="ghost" size="sm" className="text-cyan-600 gap-1">View all <ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-3">
          {criticalAlerts.map((alert, i) => (
            <Card key={i} className="p-4 border border-red-200 dark:border-red-800 shadow-sm bg-red-50/80 dark:bg-red-950/30 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-red-900 dark:text-red-100">{alert.title}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-red-700 dark:text-red-300">{alert.time}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{alert.dept}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 gap-1 flex-shrink-0">
                  Review <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* High alerts */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">High priority alerts</h2>
          <Button variant="ghost" size="sm" className="text-cyan-600 gap-1">View all <ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-3">
          {highAlerts.map((alert, i) => (
            <Card key={i} className="p-4 border border-amber-200 dark:border-amber-800 shadow-sm bg-amber-50/80 dark:bg-amber-950/30 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1">{alert.title}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-amber-700 dark:text-amber-300">{alert.time}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{alert.dept}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-1 flex-shrink-0">
                  Review <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Risk assessment */}
      <div className="max-w-7xl mx-auto">
        <Card className="p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-6">Risk assessment matrix</h3>
          <div className="space-y-5">
            {riskAreas.map((item) => {
              const isExcellent = item.score >= 85
              const isGood = item.score >= 70 && item.score < 85
              const color = isExcellent ? 'from-cyan-500 to-emerald-500' : isGood ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'
              const textColor = isExcellent ? 'text-emerald-600 dark:text-emerald-400' : isGood ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
              return (
                <div key={item.area}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span className="font-semibold text-slate-900 dark:text-white">{item.area}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${textColor}`}>{item.status}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">{item.score}%</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

    </div>
  )
}

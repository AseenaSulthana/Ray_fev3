'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Server,
  HardDrive,
  Activity,
  RefreshCw,
  Download,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const throughputData = [
  { hour: '00h', queries: 120, resolved: 108, escalated: 12 },
  { hour: '04h', queries: 80, resolved: 74, escalated: 6 },
  { hour: '08h', queries: 320, resolved: 290, escalated: 30 },
  { hour: '10h', queries: 480, resolved: 440, escalated: 40 },
  { hour: '12h', queries: 510, resolved: 465, escalated: 45 },
  { hour: '14h', queries: 490, resolved: 450, escalated: 40 },
  { hour: '16h', queries: 420, resolved: 385, escalated: 35 },
  { hour: '18h', queries: 280, resolved: 260, escalated: 20 },
  { hour: '22h', queries: 140, resolved: 130, escalated: 10 },
]

const responseTimeData = [
  { day: 'Mon', p50: 120, p95: 380, p99: 640 },
  { day: 'Tue', p50: 115, p95: 360, p99: 610 },
  { day: 'Wed', p50: 130, p95: 410, p99: 680 },
  { day: 'Thu', p50: 145, p95: 450, p99: 720 },
  { day: 'Fri', p50: 125, p95: 390, p99: 650 },
  { day: 'Sat', p50: 90, p95: 280, p99: 480 },
  { day: 'Sun', p50: 85, p95: 260, p99: 440 },
]

const recentOps = [
  { label: 'System backup completed', time: '2 hours ago', type: 'success' },
  { label: 'Database migration scheduled', time: 'Tomorrow 02:00 AM', type: 'scheduled' },
  { label: 'Security patch applied', time: 'Yesterday 11:30 PM', type: 'success' },
  { label: 'ML model retrained on new data', time: '3 days ago', type: 'success' },
  { label: 'Storage alert — 75% capacity', time: '5 days ago', type: 'warning' },
]

const healthItems = [
  { label: 'API Servers', pct: 100, status: 'Healthy', Icon: Server, good: true },
  { label: 'Database Cluster', pct: 100, status: 'Healthy', Icon: Database, good: true },
  { label: 'Storage', pct: 75, status: '75% used', Icon: HardDrive, good: false },
  { label: 'Cache Layer', pct: 100, status: 'Healthy', Icon: Activity, good: true },
  { label: 'AI Pipeline', pct: 98, status: '98% uptime', Icon: Zap, good: true },
]

const kpiCards = [
  { label: 'System Uptime', value: '99.8%', trend: '+0.1%', up: true, icon: Activity, color: 'cyan' },
  { label: 'Avg Response', value: '145ms', trend: '-12%', up: true, icon: Zap, color: 'emerald' },
  { label: 'Active Sessions', value: '1,248', trend: '+8%', up: true, icon: Users, color: 'cyan' },
  { label: 'Open Incidents', value: '2', trend: '-50%', up: true, icon: AlertCircle, color: 'emerald' },
]

const colorMap: Record<string, string> = {
  cyan: 'from-cyan-50 to-cyan-100/50 dark:from-cyan-950/20 dark:to-cyan-900/10 text-cyan-700 dark:text-cyan-400',
  emerald: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-emerald-700 dark:text-emerald-400',
}

export function OperationalIntelligence() {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-cyan-50 via-white to-cyan-100 dark:from-cyan-950/90 dark:via-slate-950 dark:to-slate-950 p-8 space-y-8">

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Operational Intelligence</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">Real-time infrastructure health and system performance</p>
          </div>
          <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700 flex-shrink-0">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI ribbon */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {card.up ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                  <span className={`text-sm font-semibold ${card.up ? 'text-green-600' : 'text-red-600'}`}>{card.trend}</span>
                  <span className="text-xs opacity-70">vs last week</span>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-4">Query throughput (24h)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="hour" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Area type="monotone" dataKey="queries" fill="#06b6d4" stroke="#06b6d4" fillOpacity={0.25} name="Total queries" />
              <Area type="monotone" dataKey="resolved" fill="#10b981" stroke="#10b981" fillOpacity={0.25} name="Resolved" />
              <Area type="monotone" dataKey="escalated" fill="#ef4444" stroke="#ef4444" fillOpacity={0.2} name="Escalated" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-4">Response times (ms)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="day" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Line type="monotone" dataKey="p50" stroke="#06b6d4" strokeWidth={2} dot={false} name="p50" />
              <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} dot={false} name="p95" />
              <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} name="p99" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Health + Recent ops */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-5">System health</h3>
          <div className="space-y-4">
            {healthItems.map((item) => {
              const Icon = item.Icon
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.good ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-500'}`} />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${item.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{item.status}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.good ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-5">Recent operations</h3>
          <div className="space-y-3">
            {recentOps.map((op, i) => {
              const isSuccess = op.type === 'success'
              const isScheduled = op.type === 'scheduled'
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSuccess ? 'bg-emerald-100 dark:bg-emerald-900/30' : isScheduled ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                      {isSuccess ? <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        : isScheduled ? <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{op.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{op.time}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ml-2 flex-shrink-0 ${isSuccess ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : isScheduled ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {op.type}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Summary tiles */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Queries processed today', value: '4,821', trend: '+6%', up: true, Icon: Zap },
          { label: 'Active API integrations', value: '12', trend: '+2', up: true, Icon: RefreshCw },
          { label: 'Concurrent sessions', value: '187', trend: '-3%', up: false, Icon: Users },
        ].map((item, i) => (
          <Card key={i} className="p-6 border-0 shadow-sm bg-cyan-50/90 dark:bg-cyan-950/80">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">{item.label}</p>
                <p className="text-3xl font-bold text-cyan-900 dark:text-cyan-100 mt-2">{item.value}</p>
              </div>
              <item.Icon className="h-8 w-8 text-cyan-600 opacity-40" />
            </div>
            <div className="flex items-center gap-2">
              {item.up ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              <span className={`text-sm font-semibold ${item.up ? 'text-green-600' : 'text-red-600'}`}>{item.trend}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">vs yesterday</span>
            </div>
          </Card>
        ))}
      </div>

    </div>
  )
}

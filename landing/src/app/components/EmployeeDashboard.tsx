'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, LayoutDashboard, MessageSquare, Settings, LogOut, Users, FileText } from 'lucide-react';

interface EmployeeDashboardProps {
  onLogout: () => void;
}

type SectionId = 'dashboard' | 'tickets' | 'knowledge' | 'settings';

const navItems: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'tickets', label: 'My Tickets', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'knowledge', label: 'Knowledge Base', icon: <FileText className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

export default function EmployeeDashboard({ onLogout }: EmployeeDashboardProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-slate-950 text-slate-100">
          <div className="border-b border-slate-800 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">Employee</p>
                <h1 className="text-lg font-semibold">RAY Desk</h1>
              </div>
            </div>
          </div>

          <nav className="px-4 py-5">
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-slate-900/80 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Signed in as</p>
              <p className="mt-2 text-sm font-semibold text-white">Employee</p>
              <p className="text-xs text-slate-400">IT Support</p>
              <button
                type="button"
                onClick={onLogout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 lg:px-12">
          <AnimatePresence mode="wait">
            {activeSection === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="mx-auto max-w-6xl space-y-6"
              >
                <header className="rounded-3xl border border-cyan-100 bg-white p-8 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">Employee Dashboard</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Your workspace at a glance</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Access your tickets, knowledge base, and account settings from the sidebar. The Dashboard item now opens this view correctly.
                  </p>
                </header>

                <section className="grid gap-4 md:grid-cols-3">
                  <StatCard title="Open Tickets" value="4" detail="2 need attention today" />
                  <StatCard title="Resolved This Week" value="11" detail="Great progress this sprint" />
                  <StatCard title="Knowledge Articles" value="26" detail="Recommended for your team" />
                </section>

                <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
                    <div className="mt-5 space-y-4">
                      {[
                        'Password reset completed for your account',
                        'New KB article published by IT Support',
                        'Ticket #A-204 moved to In Progress',
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-500" />
                          <p className="text-sm text-slate-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Quick links</h3>
                    <div className="mt-5 space-y-3">
                      {['Open a ticket', 'Browse knowledge base', 'Update profile'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:border-cyan-200 hover:bg-cyan-50"
                        >
                          <span>{item}</span>
                          <span className="text-slate-400">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <h2 className="text-2xl font-bold text-slate-900">{navItems.find((item) => item.id === activeSection)?.label}</h2>
                <p className="mt-3 text-sm text-slate-600">
                  This section is available from the sidebar. You can expand this area with live content next.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

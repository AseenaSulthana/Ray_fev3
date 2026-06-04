'use client';

import { Button } from '@/components/ui/button';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Admin Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold">Administration overview</h1>
        <p className="mt-3 text-sm text-slate-300">
          This landing dashboard wrapper is now present so the auth flow can render correctly.
        </p>
        <Button className="mt-6" onClick={onLogout}>Logout</Button>
      </div>
    </div>
  );
}

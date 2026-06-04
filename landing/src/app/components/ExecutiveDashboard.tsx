'use client';

import { Button } from '@/components/ui/button';

interface ExecutiveDashboardProps {
  onLogout: () => void;
}

export default function ExecutiveDashboard({ onLogout }: ExecutiveDashboardProps) {
  return (
    <div className="min-h-screen bg-cyan-950 p-8 text-cyan-50">
      <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-900 bg-cyan-900/40 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Executive Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold">Executive intelligence center</h1>
        <p className="mt-3 text-sm text-cyan-100/80">
          This wrapper keeps the landing auth flow complete while the sidebar is expanded elsewhere.
        </p>
        <Button className="mt-6" onClick={onLogout}>Logout</Button>
      </div>
    </div>
  );
}

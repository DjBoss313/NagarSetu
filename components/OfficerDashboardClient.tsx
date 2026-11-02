'use client';

import { CIVIC_CATEGORIES } from '@/lib/ai/categorize';
import { PriorityFactor, Report, REPORT_STATUSES } from '@/lib/types';
import { formatDateIndian, getPriorityBadgeClass, getStatusBadgeClass } from '@/lib/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface OfficerDashboardClientProps {
  initialReports: Report[];
}

export default function OfficerDashboardClient({
  initialReports,
}: OfficerDashboardClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = initialReports.length;
    const critical = initialReports.filter((r) => r.priority_label === 'Critical').length;
    const open = initialReports.filter(
      (r) => !['Resolved', 'Rejected', 'Merged'].includes(r.status)
    ).length;
    const resolved = initialReports.filter((r) => r.status === 'Resolved').length;
    return { total, critical, open, resolved };
  }, [initialReports]);

  // Chart Data: by Category
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of CIVIC_CATEGORIES) counts[c] = 0;
    for (const r of initialReports) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [initialReports]);

  // Chart Data: by Status
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of REPORT_STATUSES) counts[s] = 0;
    for (const r of initialReports) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return Object.entries(counts);
  }, [initialReports]);

  // Filtered & Ranked Reports
  const filteredReports = useMemo(() => {
    return initialReports
      .filter((r) => {
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
        if (priorityFilter !== 'All' && r.priority_label !== priorityFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCode = r.tracking_code.toLowerCase().includes(q);
          const matchDesc = r.description.toLowerCase().includes(q);
          const matchAddr = r.address?.toLowerCase().includes(q);
          if (!matchCode && !matchDesc && !matchAddr) return false;
        }
        return true;
      })
      .sort((a, b) => b.priority_score - a.priority_score);
  }, [initialReports, statusFilter, categoryFilter, priorityFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Complaints
          </span>
          <span className="text-3xl font-black font-mono text-slate-900">
            {metrics.total}
          </span>
          <span className="text-[11px] text-slate-400">Registered across city wards</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-1 bg-gradient-to-br from-white to-red-50/40">
          <span className="text-xs font-bold uppercase tracking-wider text-red-700">
            Critical Priority
          </span>
          <span className="text-3xl font-black font-mono text-red-700">
            {metrics.critical}
          </span>
          <span className="text-[11px] text-red-600/80 font-medium">Requires immediate dispatch</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-1 bg-gradient-to-br from-white to-amber-50/30">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Active / Open
          </span>
          <span className="text-3xl font-black font-mono text-amber-800">
            {metrics.open}
          </span>
          <span className="text-[11px] text-amber-700/70 font-medium">In triage, assigned or progress</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-1 bg-gradient-to-br from-white to-emerald-50/30">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Resolved
          </span>
          <span className="text-3xl font-black font-mono text-emerald-700">
            {metrics.resolved}
          </span>
          <span className="text-[11px] text-emerald-700/70 font-medium">Completed & closed</span>
        </div>
      </section>

      {/* 2. Simple Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reports by Category Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Complaints by Category
            </h3>
            <span className="text-xs text-slate-400 font-mono">Distribution</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {categoryStats.map(([cat, count]) => {
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={cat} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span className="truncate">{cat}</span>
                    <span className="font-mono text-slate-500 shrink-0 ml-2">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reports by Status Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Workflow Status Progression
            </h3>
            <span className="text-xs text-slate-400 font-mono">Lifecycle</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {statusStats.map(([status, count]) => {
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={status} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{status}</span>
                    <span className="font-mono text-slate-500 shrink-0 ml-2">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        status === 'Resolved'
                          ? 'bg-emerald-500'
                          : status === 'In Progress'
                          ? 'bg-amber-500'
                          : status === 'Assigned'
                          ? 'bg-amber-400'
                          : status === 'Under Review'
                          ? 'bg-amber-300'
                          : status === 'Rejected'
                          ? 'bg-slate-400'
                          : status === 'Merged'
                          ? 'bg-purple-400'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Filters & Search */}
      <section className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <input
              type="text"
              name="officerSearch"
              aria-label="Search complaints by code, keyword, or address"
              placeholder="Search by code (NS-...), keyword, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            <span aria-hidden="true" className="absolute left-3 top-3 text-xs text-slate-400">🔍</span>
          </div>

          {/* Status Filter */}
          <select
            name="statusFilter"
            aria-label="Filter complaints by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            name="categoryFilter"
            aria-label="Filter complaints by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            {CIVIC_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            name="priorityFilter"
            aria-label="Filter complaints by priority level"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical (75-100)</option>
            <option value="High">High (50-74)</option>
            <option value="Medium">Medium (25-49)</option>
            <option value="Low">Low (0-24)</option>
          </select>
        </div>
      </section>

      {/* 4. Priority-Ranked Reports List */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Priority-Ranked Complaints
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono font-bold">
              {filteredReports.length}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Sorted by transparent priority score (0-100)
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 text-sm shadow-card flex flex-col items-center gap-2">
            <span className="text-3xl">📋</span>
            <span className="font-semibold">No complaints match the current filter criteria.</span>
            <span className="text-xs text-slate-400">Try adjusting your search keywords or resetting filters.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredReports.map((report) => {
              // Extract top factor for display
              let topFactorText = '';
              if (report.priority_factors_json) {
                try {
                  const factors: PriorityFactor[] = JSON.parse(report.priority_factors_json);
                  if (factors.length > 0) {
                    const sortedFactors = [...factors].sort((a, b) => b.points - a.points);
                    const topF = sortedFactors[0];
                    topFactorText = `+${topF.points} ${topF.reason}`;
                  }
                } catch {
                  // Fallback
                }
              }

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col sm:flex-row items-start justify-between gap-4 group hover:-translate-y-0.5"
                >
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    {/* Header line: Tracking code, category, priority badge, status */}
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {report.tracking_code}
                      </span>
                      <span className="font-bold text-slate-700 px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
                        {report.category}
                      </span>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-lg border ${getPriorityBadgeClass(
                          report.priority_label
                        )}`}
                      >
                        Score {report.priority_score} • {report.priority_label}
                      </span>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-lg border ${getStatusBadgeClass(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>
                      {report.duplicate_of && (
                        <span className="font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                          ⚡ Duplicate Link
                        </span>
                      )}
                    </div>

                    {/* Description / Summary */}
                    <p className="text-sm text-slate-800 font-semibold line-clamp-2">
                      {report.summary || report.description}
                    </p>

                    {/* Top factor callout */}
                    {topFactorText && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50/70 border border-blue-200/60 rounded-lg px-2.5 py-1 w-fit">
                        <span className="font-bold">Top Factor:</span>
                        <span>{topFactorText}</span>
                      </div>
                    )}

                    {/* Address & Meta */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-medium">
                      <span className="truncate">
                        📍 {report.address || `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}
                      </span>
                      <span className="shrink-0 font-mono">
                        {formatDateIndian(report.created_at)}
                      </span>
                      {report.assignee && (
                        <span className="shrink-0 font-semibold text-slate-700">
                          👤 {report.assignee}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="sm:self-center shrink-0">
                    <Link
                      href={`/officer/reports/${report.id}`}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs inline-block cursor-pointer"
                    >
                      Manage Report →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

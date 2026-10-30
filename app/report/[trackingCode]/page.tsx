import { getDb } from '@/lib/db';
import { PriorityFactor, Report, StatusHistory } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const instant = false;

interface PageProps {
  params: Promise<{ trackingCode: string }>;
}

export default async function ReportResultPage({ params }: PageProps) {
  const { trackingCode } = await params;
  const db = getDb();

  const report = db
    .prepare('SELECT * FROM reports WHERE tracking_code = ? COLLATE NOCASE')
    .get(trackingCode) as Report | undefined;

  if (!report) {
    notFound();
  }

  // Get status history timeline
  const history = db
    .prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY id ASC')
    .all(report.id) as StatusHistory[];

  // If duplicate_of is linked, fetch the original report details
  let originalReport: Report | undefined;
  if (report.duplicate_of) {
    originalReport = db
      .prepare('SELECT * FROM reports WHERE id = ?')
      .get(report.duplicate_of) as Report | undefined;
  }

  const priorityFactors: PriorityFactor[] = report.priority_factors_json
    ? JSON.parse(report.priority_factors_json)
    : [];

  const statusSteps = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
  const currentStatusIndex = statusSteps.indexOf(report.status);
  const isTerminalSpecial = report.status === 'Rejected' || report.status === 'Merged';

  const getPriorityColor = (label: string) => {
    switch (label) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getPriorityGauge = (score: number) => {
    if (score >= 75) return 'bg-red-600';
    if (score >= 50) return 'bg-amber-500';
    if (score >= 25) return 'bg-blue-600';
    return 'bg-emerald-500';
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex flex-col gap-6">
      {/* Top Banner & Tracking Code Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Tracking Code
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Citizen Report
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {report.tracking_code}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registered on {new Date(report.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Current Lifecycle Status</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border ${
            report.status === 'Resolved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : report.status === 'Rejected'
              ? 'bg-red-50 text-red-700 border-red-200'
              : report.status === 'Merged'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {report.status}
          </span>
        </div>
      </div>

      {/* Near-Duplicate Alert Banner */}
      {report.duplicate_of && originalReport && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold text-lg">
            ⚡
          </div>
          <div className="flex-1 text-sm">
            <div className="font-bold text-amber-900 text-base">
              Near-Duplicate Detected & Linked
            </div>
            <p className="text-amber-800 mt-1 leading-relaxed">
              Our TF-IDF & proximity scanner linked this submission to active report{' '}
              <Link
                href={`/report/${originalReport.tracking_code}`}
                className="font-mono font-bold underline hover:text-amber-950"
              >
                {originalReport.tracking_code}
              </Link>{' '}
              located within ~150 meters. Both reports remain active and linked for officer verification so field crews aren't double-dispatched.
            </p>
            <div className="mt-2 text-xs font-medium text-amber-700 bg-amber-100/60 rounded-lg p-2 font-mono">
              Original: &quot;{originalReport.description}&quot;
            </div>
          </div>
        </div>
      )}

      {/* Status Progress Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Resolution Timeline
        </h2>

        {!isTerminalSpecial ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              return (
                <div
                  key={step}
                  className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs'
                      : isPast
                      ? 'border-emerald-200 bg-emerald-50/40 text-slate-700'
                      : 'border-slate-200 bg-slate-50/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Step {idx + 1}</span>
                    {isPast && <span className="text-emerald-600">✓</span>}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>}
                  </div>
                  <div className={`text-xs font-semibold ${isCurrent ? 'font-bold text-blue-900' : ''}`}>
                    {step}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
            Report has entered terminal status:{' '}
            <span className="font-bold text-slate-900">{report.status}</span>.
          </div>
        )}

        {/* Status Activity Log */}
        {history.length > 0 && (
          <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Activity History
            </span>
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-800">
                      {h.from_status === h.to_status ? h.to_status : `${h.from_status} → ${h.to_status}`}
                    </span>
                    {h.note && <span className="text-slate-600">{h.note}</span>}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-slate-400 font-mono block">
                      {new Date(h.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{h.actor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Post-Submit AI Intelligence Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Executive Summary & Categorization */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              AI Triage Assessment
            </h2>
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                report.summary_source === 'llm'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {report.summary_source === 'llm' ? '✨ AI Summary (Gemini)' : '⚙️ Fallback Summary (Rule-based)'}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Category
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
                {report.category}
              </span>
              {report.user_category && report.user_category !== report.category && (
                <span className="text-xs text-slate-500">
                  (User chose: {report.user_category})
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Issue Executive Summary
            </span>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              &quot;{report.summary}&quot;
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Citizen Description
            </span>
            <p className="text-sm text-slate-700 bg-slate-50/60 p-3 rounded-lg border border-slate-100">
              {report.description}
            </p>
          </div>
        </div>

        {/* Explainable Priority Score & Factors */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Transparent Priority Score
            </h2>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${getPriorityColor(
                report.priority_label
              )}`}
            >
              {report.priority_label} Priority
            </span>
          </div>

          {/* Score Meter */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-slate-900 font-mono">
              {report.priority_score}
            </span>
            <span className="text-sm font-semibold text-slate-400">/ 100 points</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getPriorityGauge(
                report.priority_score
              )}`}
              style={{ width: `${report.priority_score}%` }}
            ></div>
          </div>

          <span className="text-xs text-slate-500">
            Calculated deterministically using municipal severity heuristics, sensitive proximity, and neighborhood report density.
          </span>

          {/* Factor Breakdown */}
          <div className="mt-2 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Why this score was awarded:
            </span>
            <div className="flex flex-col gap-1.5">
              {priorityFactors.length > 0 ? (
                priorityFactors.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg p-2.5"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{f.factor}</span>
                      <span className="text-slate-500 text-[11px]">{f.reason}</span>
                    </div>
                    <span className="font-mono font-bold text-blue-700 shrink-0 ml-2">
                      +{f.points}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">
                  Standard baseline priority applied.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location & Optional Image */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Location Context
          </h2>
          <div className="text-sm font-medium text-slate-800">
            {report.address || 'Address provided by geographic coordinate pin'}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            GPS Coordinates: {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
          </div>
          {report.cluster_id && (
            <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 font-medium">
              📍 Part of Hotspot Cluster #{report.cluster_id} (flagged for coordinated ward dispatch)
            </div>
          )}
        </div>

        {report.image_path && (
          <div className="shrink-0 flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Attached Photo
            </span>
            <div className="relative w-40 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
              <Image
                src={report.image_path}
                alt="Citizen complaint photo"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/"
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← File Another Complaint
        </Link>
        <Link
          href="/officer"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          View Officer Dashboard →
        </Link>
      </div>
    </main>
  );
}

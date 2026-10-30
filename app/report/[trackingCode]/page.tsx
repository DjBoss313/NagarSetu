import { getDb } from '@/lib/db';
import { PriorityFactor, PriorityLabel, Report, StatusHistory } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';

export const instant = false;

interface PageProps {
  params: Promise<{ trackingCode: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { trackingCode } = await params;
  const db = getDb();

  const report = db
    .prepare('SELECT * FROM reports WHERE tracking_code = ? COLLATE NOCASE')
    .get(trackingCode) as Report | undefined;

  // Handle Unknown Tracking Code Edge Case
  if (!report) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 w-full flex flex-col items-center text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm w-full flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-2xl font-bold">
            🔍
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Tracking Code Not Found
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              No report was found matching <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">&quot;{trackingCode}&quot;</span>. Please check for typos or enter another code.
            </p>
          </div>

          <form action="/track" method="GET" className="w-full flex gap-2 mt-2">
            <Link
              href="/track"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
            >
              Search Another Code →
            </Link>
          </form>

          <div className="pt-4 border-t border-slate-100 w-full text-xs text-slate-500">
            Or file a new report in under a minute:{' '}
            <Link href="/" className="font-bold text-blue-600 hover:underline">
              Submit New Complaint
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Fetch complete status history timeline
  const history = db
    .prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY id ASC')
    .all(report.id) as StatusHistory[];

  // If report was merged as duplicate, fetch parent report tracking code
  let parentReport: Report | undefined;
  if (report.duplicate_of) {
    parentReport = db
      .prepare('SELECT id, tracking_code, category, status, created_at FROM reports WHERE id = ?')
      .get(report.duplicate_of) as Report | undefined;
  }

  const priorityFactors: PriorityFactor[] = report.priority_factors_json
    ? JSON.parse(report.priority_factors_json)
    : [];

  const getPriorityBadgeClass = (label: PriorityLabel) => {
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

  const isMerged = report.status === 'Merged';

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 w-full flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Tracking Code
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Citizen View
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider font-mono text-slate-900">
            {report.tracking_code}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Filed on{' '}
            {new Date(report.created_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <span className="text-xs font-semibold text-slate-500">Status</span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              report.status === 'Resolved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : report.status === 'Merged'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : report.status === 'Rejected'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {report.status}
          </span>
        </div>
      </div>

      {/* Merged Duplicate Citizen Notice (No officer-only details exposed) */}
      {isMerged && parentReport && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-purple-950 flex flex-col gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <h2 className="font-bold text-sm text-purple-950 uppercase tracking-wide">
              Report Consolidated with Ongoing Primary Issue
            </h2>
          </div>
          <p className="text-xs text-purple-900 leading-relaxed">
            This issue was identified as a near-duplicate of existing complaint{' '}
            <Link
              href={`/report/${parentReport.tracking_code}`}
              className="font-mono font-bold underline hover:text-purple-700"
            >
              [{parentReport.tracking_code}]
            </Link>
            . To avoid duplicating field crews, resolution is being coordinated directly through the primary issue.
          </p>
          <div className="pt-1">
            <Link
              href={`/report/${parentReport.tracking_code}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              <span>Track Primary Report [{parentReport.tracking_code}]</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Near-Duplicate Link Banner (if linked but not merged yet) */}
      {!isMerged && report.duplicate_of && parentReport && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
          <span className="text-base shrink-0">⚡</span>
          <div>
            <span className="font-bold block mb-0.5">Similar Issue Located Nearby:</span>
            A related complaint exists within ~150 meters ({' '}
            <Link
              href={`/report/${parentReport.tracking_code}`}
              className="font-mono font-bold underline hover:text-amber-950"
            >
              {parentReport.tracking_code}
            </Link>{' '}
            ). Both complaints are linked for coordinated municipal field dispatch.
          </div>
        </div>
      )}

      {/* Full Status Timeline from status_history */}
      <section className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Status Resolution Timeline
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {history.length} Event{history.length > 1 ? 's' : ''} Logged
          </span>
        </div>

        <div className="flex flex-col gap-3 relative before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-0.5 before:bg-slate-200">
          {history.map((event, idx) => {
            const isLatest = idx === history.length - 1;
            return (
              <div key={event.id} className="flex items-start gap-4 relative z-10">
                {/* Circle marker */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 ${
                    isLatest
                      ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-50'
                      : 'bg-white text-slate-500 border-slate-300'
                  }`}
                >
                  {isLatest ? '●' : '✓'}
                </div>

                {/* Content card */}
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex flex-col gap-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-bold text-slate-900">
                      {event.from_status === event.to_status
                        ? event.to_status
                        : `${event.from_status} → ${event.to_status}`}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(event.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  {/* Public note only - sanitize officer notes for citizen */}
                  {event.note && (
                    <p className="text-slate-600 leading-relaxed mt-0.5">
                      {event.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Assessment Card */}
      <section className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              AI Triage Assessment
            </h2>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              report.summary_source === 'llm'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {report.summary_source === 'llm' ? 'AI summary' : 'Fallback summary (no LLM key)'}
          </span>
        </div>

        {/* Category & Summary */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">
              Assigned Category:
            </span>
            <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
              {report.category}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Issue Executive Summary
            </span>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              &quot;{report.summary}&quot;
            </p>
          </div>
        </div>

        {/* Priority Score & Explainable Factor Breakdown */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Transparent Priority Score:
              </span>
              <span className="text-2xl font-extrabold font-mono text-slate-900">
                {report.priority_score}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 100</span>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${getPriorityBadgeClass(
                report.priority_label
              )}`}
            >
              {report.priority_label} Priority
            </span>
          </div>

          {/* Meter Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                report.priority_score >= 75
                  ? 'bg-red-600'
                  : report.priority_score >= 50
                  ? 'bg-amber-500'
                  : report.priority_score >= 25
                  ? 'bg-blue-600'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${report.priority_score}%` }}
            />
          </div>

          {/* Plain Language Factor List */}
          <div className="mt-1 flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Scoring Factors:
            </span>
            {priorityFactors.length > 0 ? (
              priorityFactors.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-slate-700"
                >
                  <span className="font-medium">
                    +{f.points} {f.reason}
                  </span>
                  <span className="font-mono font-bold text-blue-700 ml-2 shrink-0">
                    +{f.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic">Baseline score applied.</div>
            )}
          </div>
        </div>
      </section>

      {/* Details, Location & Photo */}
      <section className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          Reported Information
        </h3>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Citizen Description
          </span>
          <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
            {report.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              Location Landmark
            </span>
            <span className="font-medium text-slate-800">
              {report.address || 'Location defined by coordinates'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              GPS Coordinates
            </span>
            <span className="font-mono font-medium text-slate-700">
              {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Photo Edge Case: Handled gracefully if no image */}
        {report.image_path ? (
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Attached Photo
            </span>
            <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <Image
                src={report.image_path}
                alt="Complaint photo"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400 italic text-center">
            No photo was attached with this report.
          </div>
        )}
      </section>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between text-xs font-bold pt-1">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
          ← File Another Complaint
        </Link>
        <Link href="/track" className="text-slate-600 hover:text-slate-900 transition-colors">
          Track by Code →
        </Link>
      </div>
    </main>
  );
}

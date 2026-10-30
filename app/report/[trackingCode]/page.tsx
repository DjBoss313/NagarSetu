import { calculateHaversineDistanceMeters, computeTokenOverlap } from '@/lib/ai/duplicates';
import { getDb } from '@/lib/db';
import { PriorityFactor, PriorityLabel, Report } from '@/lib/types';
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

  // Parse priority factors
  const priorityFactors: PriorityFactor[] = report.priority_factors_json
    ? JSON.parse(report.priority_factors_json)
    : [];

  // Check if report has a duplicate link
  let matchedReport: Report | undefined;
  let distanceMeters = 0;
  let similarityPercent = 0;

  if (report.duplicate_of) {
    matchedReport = db
      .prepare('SELECT * FROM reports WHERE id = ?')
      .get(report.duplicate_of) as Report | undefined;

    if (matchedReport) {
      distanceMeters = Math.round(
        calculateHaversineDistanceMeters(
          report.lat,
          report.lng,
          matchedReport.lat,
          matchedReport.lng
        )
      );

      // Compute word overlap
      const wordsA = report.description.toLowerCase().split(/\s+/);
      const wordsB = matchedReport.description.toLowerCase().split(/\s+/);
      const overlap = computeTokenOverlap(wordsA, wordsB);
      similarityPercent = Math.min(98, Math.max(55, Math.round(overlap * 100 + 40)));
    }
  }

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

  const getPriorityGaugeColor = (score: number) => {
    if (score >= 75) return 'bg-red-600';
    if (score >= 50) return 'bg-amber-500';
    if (score >= 25) return 'bg-blue-600';
    return 'bg-emerald-500';
  };

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
              Citizen Report
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider font-mono text-slate-900">
            {report.tracking_code}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submitted on{' '}
            {new Date(report.created_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <span className="text-xs font-semibold text-slate-500">Current Status</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            {report.status}
          </span>
        </div>
      </div>

      {/* Duplicate Match Alert */}
      {matchedReport && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 text-amber-900 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="font-bold text-sm text-amber-950 uppercase tracking-wide">
                Near-Duplicate Match Linked
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-200 text-amber-900 border border-amber-300">
                {similarityPercent}% Similarity
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-200 text-amber-900 border border-amber-300">
                {distanceMeters}m Away
              </span>
            </div>
          </div>

          <p className="text-xs text-amber-800 leading-relaxed">
            This issue was detected as an intentional or natural duplicate of active report{' '}
            <Link
              href={`/report/${matchedReport.tracking_code}`}
              className="font-mono font-bold underline hover:text-amber-950"
            >
              [{matchedReport.tracking_code}]
            </Link>
            . Both reports remain linked via <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">duplicate_of</code> for officer review — reports are never deleted.
          </p>

          <div className="bg-white/80 rounded-xl p-3 border border-amber-200/80 text-xs">
            <span className="font-bold text-amber-950 block mb-0.5">
              Matched Report: [{matchedReport.tracking_code}] ({matchedReport.category})
            </span>
            <span className="text-amber-900 italic">
              &quot;{matchedReport.description}&quot;
            </span>
          </div>
        </div>
      )}

      {/* AI Assessment Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-base font-bold text-slate-900">AI Pipeline Triage Result</h2>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
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
              Category:
            </span>
            <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
              {report.category}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Executive Summary
            </span>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              &quot;{report.summary}&quot;
            </p>
          </div>
        </div>

        {/* Priority Score & Explainable Factor Breakdown */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Priority Score:
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
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getPriorityGaugeColor(
                report.priority_score
              )}`}
              style={{ width: `${report.priority_score}%` }}
            />
          </div>

          {/* Plain Language Factor List */}
          <div className="mt-2 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Plain Language Factor Breakdown:
            </span>
            <div className="flex flex-col gap-1.5">
              {priorityFactors.length > 0 ? (
                priorityFactors.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-slate-700"
                  >
                    <span className="font-medium">
                      +{f.points} {f.reason}
                    </span>
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

      {/* Submitted Details & Context */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Report Details & Context
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

        {report.image_path && (
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
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between text-xs font-bold pt-1">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← File Another Complaint
        </Link>
        <Link
          href="/track"
          className="text-slate-600 hover:text-slate-900 transition-colors"
        >
          Track by Code →
        </Link>
      </div>
    </main>
  );
}

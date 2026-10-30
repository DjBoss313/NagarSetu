import { getDb } from '@/lib/db';
import { Report } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const instant = false;

interface PageProps {
  params: Promise<{ trackingCode: string }>;
}

export default async function ReportPlaceholderPage({ params }: PageProps) {
  const { trackingCode } = await params;
  const db = getDb();

  const report = db
    .prepare('SELECT * FROM reports WHERE tracking_code = ? COLLATE NOCASE')
    .get(trackingCode) as Report | undefined;

  if (!report) {
    notFound();
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 w-full flex flex-col gap-6">
      {/* Top Success Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-lg">
          ✓
        </div>
        <div>
          <h2 className="text-base font-bold text-emerald-950">
            Complaint Registered Successfully
          </h2>
          <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
            Your complaint has been logged in the municipal database. Keep your tracking code safe to check progress.
          </p>
        </div>
      </div>

      {/* Tracking Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Tracking Code
            </span>
            <span className="text-3xl font-extrabold font-mono tracking-wider text-slate-900">
              {report.tracking_code}
            </span>
          </div>

          <div className="flex flex-col sm:items-end">
            <span className="text-xs font-semibold text-slate-500 mb-1">Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              {report.status}
            </span>
          </div>
        </div>

        {/* Report Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Category
            </span>
            <span className="text-sm font-bold text-slate-900">
              {report.category}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Submission Date
            </span>
            <span className="text-sm font-medium text-slate-900">
              {new Date(report.created_at).toLocaleDateString('en-IN', {
                dateStyle: 'medium',
              })}
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
            Issue Description
          </span>
          <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
            {report.description}
          </p>
        </div>

        {/* Location Context */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-600">
            Location
          </span>
          <span className="text-sm font-medium text-slate-900">
            {report.address || 'Address designated by coordinates'}
          </span>
          <span className="text-slate-500 font-mono mt-0.5">
            Coordinates: {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
          </span>
        </div>

        {/* Attached Photo */}
        {report.image_path && (
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Attached Photo
            </span>
            <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <Image
                src={report.image_path}
                alt="Uploaded complaint photo"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* To-Do 4 Placeholder Notice */}
        <div className="mt-2 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 text-purple-900 flex items-start gap-3">
          <span className="text-xl shrink-0">🤖</span>
          <div className="text-xs leading-relaxed">
            <span className="font-bold block text-purple-950 mb-0.5">
              AI Pipeline Triage (Coming in To-Do 4)
            </span>
            In the next step, our AI engine will automatically summarize, scan for duplicates, calculate transparent priority scores, and assign hotspot clusters to this report.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold">
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
      </div>
    </main>
  );
}

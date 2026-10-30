'use client';

import { ALLOWED_STATUS_TRANSITIONS, PriorityFactor, PriorityLabel, Report, REPORT_STATUSES, ReportStatus, StatusHistory } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const COMMON_ASSIGNEES = [
  'Ward 112 Road Maintenance Crew',
  'Bescom Electrical Dispatch',
  'BWSSB Water & Sewage Division',
  'BBMP Solid Waste Management',
  'Traffic & Encroachment Task Force',
  'Emergency Field Response Team',
];

interface OfficerReportDetailClientProps {
  initialReport: Report;
  initialHistory: StatusHistory[];
  parentReport?: Report | null;
  childDuplicates?: Report[];
}

export default function OfficerReportDetailClient({
  initialReport,
  initialHistory,
  parentReport: initialParent,
  childDuplicates: initialChildren = [],
}: OfficerReportDetailClientProps) {
  const router = useRouter();

  const [report, setReport] = useState<Report>(initialReport);
  const [history, setHistory] = useState<StatusHistory[]>(initialHistory);
  const [parentReport, setParentReport] = useState<Report | null | undefined>(initialParent);

  // Assignee state
  const [assigneeInput, setAssigneeInput] = useState(report.assignee || '');
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [assigneeSuccess, setAssigneeSuccess] = useState(false);

  // Status transition state
  const [selectedNextStatus, setSelectedNextStatus] = useState<ReportStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Duplicate action state
  const [isProcessingDuplicate, setIsProcessingDuplicate] = useState(false);

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const priorityFactors: PriorityFactor[] = report.priority_factors_json
    ? JSON.parse(report.priority_factors_json)
    : [];

  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[report.status] || [];

  // 1. Handle Status Change
  const handleStatusChange = async (targetStatus: ReportStatus) => {
    setIsUpdatingStatus(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          note: statusNote.trim() || undefined,
          actor: 'Officer',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setReport(data.report);
      setHistory(data.history);
      setStatusNote('');
      setSelectedNextStatus('');
      setSuccessMessage(`Status successfully updated to '${targetStatus}'.`);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 2. Handle Assignee Update
  const handleAssigneeUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsUpdatingAssignee(true);
    setErrorMessage('');
    setAssigneeSuccess(false);

    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignee: assigneeInput.trim(),
          actor: 'Officer',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update assignee');
      }

      setReport(data.report);
      setHistory(data.history);
      setAssigneeSuccess(true);
      setTimeout(() => setAssigneeSuccess(false), 3000);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating assignee');
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  // 3. Handle Duplicate Actions (Confirm Merge / Reject Link)
  const handleDuplicateAction = async (action: 'confirm_merge' | 'reject_link') => {
    setIsProcessingDuplicate(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duplicate_action: action,
          actor: 'Officer',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process duplicate action');
      }

      setReport(data.report);
      setHistory(data.history);
      if (action === 'reject_link') {
        setParentReport(null);
        setSuccessMessage('Duplicate link rejected. Marked as independent civic complaint.');
      } else {
        setSuccessMessage('Duplicate confirmed. Report moved to Merged status.');
      }
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error processing duplicate');
    } finally {
      setIsProcessingDuplicate(false);
    }
  };

  const getPriorityBadge = (label: PriorityLabel) => {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/officer"
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
        >
          ← Back to Officer Triage
        </Link>
        <Link
          href={`/report/${report.tracking_code}`}
          target="_blank"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline"
        >
          Open Public Citizen Tracking View ↗
        </Link>
      </div>

      {/* Error / Success Notifications */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-start gap-2 shadow-2xs">
          <span>⚠️</span>
          <div className="flex-1">
            <span className="font-bold block">Status Transition Blocked:</span>
            {errorMessage}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Header Card */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Report ID #{report.id}
            </span>
            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
              {report.tracking_code}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {report.category}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {report.summary || report.description}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered on {new Date(report.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-slate-500">Status</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              report.status === 'Resolved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : report.status === 'Rejected'
                ? 'bg-red-50 text-red-700 border-red-200'
                : report.status === 'Merged'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {report.status}
          </span>
        </div>
      </section>

      {/* Duplicate Verification Card (Confirm Merge / Reject Link) */}
      {report.duplicate_of && parentReport && (
        <section className="bg-amber-50/90 border border-amber-300 rounded-2xl p-6 flex flex-col gap-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <h3 className="font-extrabold text-sm text-amber-950 uppercase tracking-wide">
                  Suspected Duplicate Link Verification
                </h3>
                <span className="text-xs text-amber-800">
                  Linked to parent issue #{parentReport.id} [{parentReport.tracking_code}]
                </span>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-200 text-amber-900 border border-amber-300 font-mono">
              Proximity Match
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200">
              <span className="font-bold text-amber-950 block mb-1">
                This Report [{report.tracking_code}]
              </span>
              <p className="text-slate-800 italic">&quot;{report.description}&quot;</p>
              <span className="text-slate-500 text-[11px] block mt-1">
                Status: {report.status} • Category: {report.category}
              </span>
            </div>

            <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200">
              <span className="font-bold text-amber-950 block mb-1">
                Parent Report [{parentReport.tracking_code}]
              </span>
              <p className="text-slate-800 italic">&quot;{parentReport.description}&quot;</p>
              <span className="text-slate-500 text-[11px] block mt-1">
                Status: {parentReport.status} • Category: {parentReport.category}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <p className="text-xs text-amber-900 leading-relaxed max-w-lg">
              Confirming will set this report&apos;s status to <strong>Merged</strong> and note it in history. Rejecting unlinks this report as an independent issue.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessingDuplicate || report.status === 'Merged'}
                onClick={() => handleDuplicateAction('reject_link')}
                className="px-4 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors shadow-2xs disabled:opacity-50"
              >
                Reject Link
              </button>
              <button
                type="button"
                disabled={isProcessingDuplicate || report.status === 'Merged'}
                onClick={() => handleDuplicateAction('confirm_merge')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs disabled:opacity-50"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Child Duplicates Listed */}
      {initialChildren.length > 0 && (
        <section className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
            Reports Linked to this Issue as Duplicates ({initialChildren.length})
          </span>
          <div className="flex flex-col gap-2">
            {initialChildren.map((c) => (
              <div
                key={c.id}
                className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">[{c.tracking_code}]</span>
                  <span className="text-slate-700 truncate max-w-md">{c.description}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-purple-700">{c.status}</span>
                  <Link
                    href={`/officer/reports/${c.id}`}
                    className="font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Workflow Controls: Assign & Status Transitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department / Officer Assignment */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Department & Personnel Assignment
            </h2>
            {assigneeSuccess && (
              <span className="text-xs font-bold text-emerald-600">✓ Assigned!</span>
            )}
          </div>

          <form onSubmit={handleAssigneeUpdate} className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Assignee / Unit
              </label>
              <input
                type="text"
                placeholder="Enter crew or officer name..."
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Assign Suggestions */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                Quick Select Unit:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ASSIGNEES.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setAssigneeInput(unit)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                  >
                    {unit.split(' ')[0]} {unit.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingAssignee}
              className="mt-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs"
            >
              {isUpdatingAssignee ? 'Updating...' : 'Save Assignment'}
            </button>
          </form>
        </section>

        {/* Change Status with Enforced Transitions */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Update Status Lifecycle
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Current: {report.status}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Permitted Next Transitions:
              </span>
              {allowedNextStatuses.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                  Report is in terminal state ({report.status}). No further transitions allowed.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowedNextStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedNextStatus(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedNextStatus === st
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Move to &quot;{st}&quot;
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Officer Note */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Officer Transition Note
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes for the status change (e.g. Field inspection completed, repair initiated)..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {selectedNextStatus && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusChange(selectedNextStatus)}
                className="py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs"
              >
                {isUpdatingStatus ? 'Transitioning...' : `Confirm Status Change: ${report.status} → ${selectedNextStatus}`}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* AI Assessment, Priority Factors & Photo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Triage & Factors */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              AI Triage & Priority Evaluation
            </h2>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                report.summary_source === 'llm'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {report.summary_source === 'llm' ? '✨ AI summary' : '⚙️ Fallback summary (no LLM key)'}
            </span>
          </div>

          {/* Priority Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Score:
              </span>
              <span className="text-2xl font-extrabold font-mono text-slate-900">
                {report.priority_score}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getPriorityBadge(report.priority_label)}`}>
              {report.priority_label} Priority
            </span>
          </div>

          {/* Factors Breakdown */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Scoring Factors Breakdown:
            </span>
            {priorityFactors.length > 0 ? (
              priorityFactors.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-800"
                >
                  <span>+{f.points} {f.reason}</span>
                  <span className="font-mono font-bold text-blue-700 ml-2">+{f.points}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic">Baseline score applied</div>
            )}
          </div>
        </section>

        {/* Location & Photo */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3">
            Location & Evidence
          </h2>

          <div className="text-xs flex flex-col gap-1">
            <span className="font-semibold text-slate-500">Location Landmark:</span>
            <span className="font-medium text-slate-800">{report.address || 'Address provided by GPS pin'}</span>
            <span className="text-slate-400 font-mono mt-0.5">
              Coordinates: {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
            </span>
          </div>

          {report.image_path ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Attached Photo:</span>
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
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
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400 italic text-center">
              No photo uploaded for this report.
            </div>
          )}
        </section>
      </div>

      {/* Status History Timeline */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Complete Audit Trail & Status History
        </h2>

        <div className="flex flex-col gap-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-100"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    {item.from_status === item.to_status ? item.to_status : `${item.from_status} → ${item.to_status}`}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    {item.actor}
                  </span>
                </div>
                {item.note && <span className="text-slate-600 mt-0.5">{item.note}</span>}
              </div>

              <div className="text-right shrink-0 ml-3">
                <span className="font-mono text-slate-400 block text-[11px]">
                  {new Date(item.created_at).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

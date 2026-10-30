import { getDb } from "@/lib/db";
import { ALLOWED_STATUS_TRANSITIONS, REPORT_STATUSES } from "@/lib/types";

export default function HomePage() {
  const db = getDb();

  // Query SQLite tables count to verify schema bootstrap
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];

  const reportCount = (db.prepare("SELECT count(*) as count FROM reports").get() as { count: number }).count;
  const clusterCount = (db.prepare("SELECT count(*) as count FROM clusters").get() as { count: number }).count;
  const historyCount = (db.prepare("SELECT count(*) as count FROM status_history").get() as { count: number }).count;

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="border-b border-slate-200 pb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xl shadow-sm">
            NS
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              NagarSetu
            </h1>
            <p className="text-sm font-medium text-slate-500">
              From Complaints to Action • Bootstrap Complete
            </p>
          </div>
        </div>
      </header>

      {/* Overview Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Database Status
          </span>
          <span className="text-lg font-bold text-emerald-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected & Ready
          </span>
          <span className="text-xs text-slate-500">
            SQLite (data/nagarsetu.db)
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Schema Tables
          </span>
          <span className="text-2xl font-bold text-slate-800">
            {tables.length} Active Tables
          </span>
          <span className="text-xs text-slate-500">
            reports, status_history, clusters
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Stack Runtime
          </span>
          <span className="text-lg font-bold text-slate-800">
            Next.js App Router
          </span>
          <span className="text-xs text-slate-500">
            TypeScript • Tailwind CSS
          </span>
        </div>
      </section>

      {/* Database Schema Verification */}
      <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-slate-900">
          Initialized Database Tables
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="font-semibold text-slate-800 text-sm">reports</div>
            <div className="text-xs text-slate-500 mt-1">Current rows: {reportCount}</div>
            <div className="text-[11px] text-slate-400 mt-2 font-mono">
              tracking_code, category, lat, lng, priority_score, summary, status
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="font-semibold text-slate-800 text-sm">clusters</div>
            <div className="text-xs text-slate-500 mt-1">Current rows: {clusterCount}</div>
            <div className="text-[11px] text-slate-400 mt-2 font-mono">
              centroid_lat, centroid_lng, radius_m, report_count, brief
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="font-semibold text-slate-800 text-sm">status_history</div>
            <div className="text-xs text-slate-500 mt-1">Current rows: {historyCount}</div>
            <div className="text-[11px] text-slate-400 mt-2 font-mono">
              report_id, from_status, to_status, note, actor, created_at
            </div>
          </div>
        </div>
      </section>

      {/* Status Lifecycle Verification */}
      <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-slate-900">
          Enforced Status Transition Graph
        </h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {REPORT_STATUSES.map((status) => (
            <div
              key={status}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
            >
              <span className="font-semibold text-slate-900">{status}</span>
              <span className="text-slate-400 mx-1">→</span>
              <span className="text-slate-500">
                {ALLOWED_STATUS_TRANSITIONS[status]?.length > 0
                  ? ALLOWED_STATUS_TRANSITIONS[status].join(", ")
                  : "Terminal state"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

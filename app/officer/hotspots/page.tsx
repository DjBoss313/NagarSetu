import OfficerNav from '@/components/OfficerNav';
import { getDb } from '@/lib/db';
import { Cluster, Report } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function OfficerHotspotsPage() {
  const db = getDb();

  const clusters = db.prepare('SELECT * FROM clusters ORDER BY report_count DESC').all() as Cluster[];

  // Fetch all reports in clusters
  const reportsByCluster: Record<number, Report[]> = {};
  for (const c of clusters) {
    reportsByCluster[c.id] = db
      .prepare('SELECT * FROM reports WHERE cluster_id = ? ORDER BY priority_score DESC')
      .all(c.id) as Report[];
  }

  const totalClusteredReports = clusters.reduce((acc, c) => acc + c.report_count, 0);

  // Approximate area naming helper
  const getNeighborhoodName = (lat: number, lng: number) => {
    if (lat > 12.965 && lat < 12.975 && lng > 77.595 && lng < 77.61) return 'Central Bengaluru / Museum Rd';
    if (lat > 12.975 && lat < 12.985 && lng > 77.635 && lng < 77.645) return 'Indiranagar (100 Feet Rd)';
    if (lat > 12.93 && lat < 12.94 && lng > 77.62 && lng < 77.63) return 'Koramangala (80 Feet Rd)';
    if (lat > 12.978 && lat < 12.986 && lng > 77.60 && lng < 77.61) return 'Shivajinagar / Bowring Hospital';
    if (lat > 12.955 && lat < 12.965 && lng > 77.645 && lng < 77.655) return 'HAL Airport Road / Manipal';
    if (lat > 12.995 && lat < 13.015 && lng > 77.565 && lng < 77.575) return 'Malleshwaram';
    if (lat > 12.975 && lat < 12.99 && lng > 77.73 && lng < 77.76) return 'Whitefield Corridor';
    return `Ward Area (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <OfficerNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Geographic Hotspot Clusters & Action Briefs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Spatial groups of 3+ complaints within ~300 meters, automatically synthesized into actionable dispatch briefs for ward field officers.
          </p>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Active Hotspots
            </span>
            <span className="text-3xl font-extrabold font-mono text-purple-900">
              {clusters.length}
            </span>
            <span className="text-[11px] text-slate-400">Identified via distance clustering (~300m)</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Clustered Reports
            </span>
            <span className="text-3xl font-extrabold font-mono text-slate-900">
              {totalClusteredReports}
            </span>
            <span className="text-[11px] text-slate-400">Complaints consolidated in hotspots</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Average Density
            </span>
            <span className="text-3xl font-extrabold font-mono text-blue-700">
              {clusters.length > 0 ? (totalClusteredReports / clusters.length).toFixed(1) : 0}
            </span>
            <span className="text-[11px] text-slate-400">Complaints per geographic cluster</span>
          </div>
        </div>

        {/* Clusters List */}
        <div className="flex flex-col gap-5">
          {clusters.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 text-sm">
              No active clusters detected yet. Clusters form when at least 3 complaints occur within ~300m.
            </div>
          ) : (
            clusters.map((cluster) => {
              const topCategories: string[] = cluster.top_categories
                ? JSON.parse(cluster.top_categories)
                : [];
              const memberReports = reportsByCluster[cluster.id] || [];
              const areaName = getNeighborhoodName(cluster.centroid_lat, cluster.centroid_lng);

              return (
                <div
                  key={cluster.id}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs flex flex-col gap-5"
                >
                  {/* Cluster Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs">
                        #{cluster.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-slate-900">
                            {areaName}
                          </h2>
                          <span className="text-xs font-mono text-slate-400">
                            ({cluster.centroid_lat.toFixed(4)}, {cluster.centroid_lng.toFixed(4)})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Consolidates <span className="font-bold text-slate-800">{cluster.report_count} complaints</span> within a <span className="font-bold text-slate-800">{cluster.radius_m}m radius</span>
                        </div>
                      </div>
                    </div>

                    {/* Source Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          cluster.brief_source === 'llm'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {cluster.brief_source === 'llm' ? '✨ AI brief' : '⚙️ Template brief (no LLM key)'}
                      </span>
                    </div>
                  </div>

                  {/* Top Categories */}
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                      Dominant Issues:
                    </span>
                    {topCategories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Executive Action Brief Box */}
                  <div className="bg-gradient-to-r from-purple-50/70 to-indigo-50/50 rounded-xl p-4 border border-purple-200/80 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <span>📋</span> Executive Action Brief for Field Crew
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">
                      &quot;{cluster.brief}&quot;
                    </p>
                  </div>

                  {/* Member Reports Preview */}
                  <div className="flex flex-col gap-2 pt-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Consolidated Complaints ({memberReports.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {memberReports.map((r) => (
                        <Link
                          key={r.id}
                          href={`/officer/reports/${r.id}`}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-400 transition-all flex flex-col gap-1.5 text-xs group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {r.tracking_code}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                r.priority_label === 'Critical'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : r.priority_label === 'High'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              Score {r.priority_score}
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium line-clamp-1">
                            {r.description}
                          </p>
                          <span className="text-slate-400 text-[11px] truncate">
                            📍 {r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

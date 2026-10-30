import OfficerMapWrapper from '@/components/OfficerMapWrapper';
import OfficerNav from '@/components/OfficerNav';
import { getDb } from '@/lib/db';
import { Cluster, Report } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function OfficerMapPage() {
  let reports: Report[] = [];
  let clusters: Cluster[] = [];
  let dbError: string | null = null;

  try {
    const db = getDb();
    reports = db
      .prepare('SELECT * FROM reports ORDER BY priority_score DESC')
      .all() as Report[];
    clusters = db.prepare('SELECT * FROM clusters').all() as Cluster[];
  } catch (err: unknown) {
    console.error('Failed to load map data on Officer Map page:', err);
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <OfficerNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            City GIS Priority & Hotspot Map
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time visual map of all active reports color-coded by transparent priority score with geographic hotspot clusters.
          </p>
        </div>

        {dbError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-900 flex flex-col gap-3">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <span className="text-xl">⚠️</span>
              <span>Database Connection Error</span>
            </div>
            <p className="text-sm font-mono bg-white p-3 rounded-lg border border-red-100 overflow-x-auto">
              {dbError}
            </p>
          </div>
        ) : (
          <OfficerMapWrapper reports={reports} clusters={clusters} />
        )}
      </main>
    </div>
  );
}

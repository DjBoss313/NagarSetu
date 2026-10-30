import OfficerMapWrapper from '@/components/OfficerMapWrapper';
import OfficerNav from '@/components/OfficerNav';
import { getDb } from '@/lib/db';
import { Cluster, Report } from '@/lib/types';

export const instant = false;

export default function OfficerMapPage() {
  const db = getDb();

  const reports = db
    .prepare('SELECT * FROM reports ORDER BY priority_score DESC')
    .all() as Report[];

  const clusters = db.prepare('SELECT * FROM clusters').all() as Cluster[];

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

        <OfficerMapWrapper reports={reports} clusters={clusters} />
      </main>
    </div>
  );
}

import OfficerDashboardClient from '@/components/OfficerDashboardClient';
import OfficerNav from '@/components/OfficerNav';
import { getDb } from '@/lib/db';
import { Report } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function OfficerDashboardPage() {
  let reports: Report[] = [];
  let dbError: string | null = null;

  try {
    const db = getDb();
    reports = db
      .prepare('SELECT * FROM reports ORDER BY priority_score DESC, id DESC')
      .all() as Report[];
  } catch (err: unknown) {
    console.error('Failed to load reports on Officer page:', err);
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <OfficerNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {dbError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-900 flex flex-col gap-3">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <span className="text-xl">⚠️</span>
              <span>Database Connection Error</span>
            </div>
            <p className="text-sm font-mono bg-white p-3 rounded-lg border border-red-100 overflow-x-auto">
              {dbError}
            </p>
            <p className="text-xs text-red-600">
              Please check server logs or verify permissions on the data directory.
            </p>
          </div>
        ) : (
          <OfficerDashboardClient initialReports={reports} />
        )}
      </main>
    </div>
  );
}

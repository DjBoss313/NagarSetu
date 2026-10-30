import OfficerDashboardClient from '@/components/OfficerDashboardClient';
import OfficerNav from '@/components/OfficerNav';
import { getDb } from '@/lib/db';
import { Report } from '@/lib/types';

export const instant = false;

export default function OfficerDashboardPage() {
  const db = getDb();
  const reports = db
    .prepare('SELECT * FROM reports ORDER BY priority_score DESC, id DESC')
    .all() as Report[];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <OfficerNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <OfficerDashboardClient initialReports={reports} />
      </main>
    </div>
  );
}

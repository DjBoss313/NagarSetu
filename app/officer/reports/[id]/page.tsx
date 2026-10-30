import OfficerNav from '@/components/OfficerNav';
import OfficerReportDetailClient from '@/components/OfficerReportDetailClient';
import { getDb } from '@/lib/db';
import { Report, StatusHistory } from '@/lib/types';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OfficerReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId)) {
    notFound();
  }

  let report: Report | undefined;
  let history: StatusHistory[] = [];
  let parentReport: Report | null = null;
  let childDuplicates: Report[] = [];

  try {
    const db = getDb();
    report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report | undefined;
    if (!report) {
      notFound();
    }

    history = db
      .prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY id ASC')
      .all(reportId) as StatusHistory[];

    if (report.duplicate_of) {
      parentReport = (db.prepare('SELECT * FROM reports WHERE id = ?').get(report.duplicate_of) as Report) || null;
    }

    childDuplicates = db
      .prepare('SELECT * FROM reports WHERE duplicate_of = ?')
      .all(report.id) as Report[];
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest?.startsWith('NEXT_NOT_FOUND')) {
      throw err;
    }
    console.error('Failed to load report detail on Officer page:', err);
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
        <OfficerNav />
        <main className="max-w-6xl mx-auto px-4 py-8 w-full">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-900">
            <h2 className="font-bold text-red-800">Database Connection Error</h2>
            <p className="text-xs font-mono mt-2 bg-white p-3 rounded border border-red-100">
              {err instanceof Error ? err.message : String(err)}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <OfficerNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <OfficerReportDetailClient
          initialReport={report}
          initialHistory={history}
          parentReport={parentReport}
          childDuplicates={childDuplicates}
        />
      </main>
    </div>
  );
}

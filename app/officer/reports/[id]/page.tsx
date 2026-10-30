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

  const db = getDb();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report | undefined;
  if (!report) {
    notFound();
  }

  // Fetch status history
  const history = db
    .prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY id ASC')
    .all(reportId) as StatusHistory[];

  // Fetch parent duplicate report if this report is a duplicate
  let parentReport: Report | null = null;
  if (report.duplicate_of) {
    parentReport = (db.prepare('SELECT * FROM reports WHERE id = ?').get(report.duplicate_of) as Report) || null;
  }

  // Fetch child duplicates if other reports are duplicates of this one
  const childDuplicates = db
    .prepare('SELECT * FROM reports WHERE duplicate_of = ?')
    .all(report.id) as Report[];

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

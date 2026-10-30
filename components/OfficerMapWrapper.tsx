'use client';

import { Cluster, Report } from '@/lib/types';
import dynamic from 'next/dynamic';

const OfficerGisMap = dynamic(() => import('@/components/OfficerGisMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-slate-200 animate-pulse">
      <span className="text-2xl">🗺️</span>
      <span className="text-xs font-semibold">Loading municipal GIS map with priority layers...</span>
    </div>
  ),
});

export default function OfficerMapWrapper({
  reports,
  clusters,
}: {
  reports: Report[];
  clusters: Cluster[];
}) {
  return <OfficerGisMap reports={reports} clusters={clusters} />;
}

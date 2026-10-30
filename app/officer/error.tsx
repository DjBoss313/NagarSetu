'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function OfficerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Officer Portal Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm max-w-lg w-full flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-slate-900">Officer Portal Error</h2>
        <p className="text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 w-full text-left overflow-x-auto">
          {error?.message || 'An unexpected error occurred while loading officer operations.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

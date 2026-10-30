'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TrackPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a tracking code.');
      return;
    }
    router.push(`/report/${clean}`);
  };

  return (
    <div className="flex-1 max-w-xl mx-auto px-4 py-16 w-full flex flex-col justify-center">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-lg mx-auto mb-3">
            🔍
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Track Civic Complaint</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your 8-character NagarSetu tracking code (e.g. <span className="font-mono font-medium text-slate-700">NS-KO0201</span>) to view current status and AI assessment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Tracking Code
            </label>
            <input
              type="text"
              placeholder="e.g. NS-KO0201"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-900 tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
            />
            {error && <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors text-sm"
          >
            Check Status & AI Analysis →
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500 text-center">
          Sample demo codes from seed:
          <div className="flex flex-wrap justify-center gap-2 mt-2 font-mono">
            {['NS-MG0101', 'NS-MG0102', 'NS-KO0201', 'NS-IN0301'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => router.push(`/report/${c}`)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex-1 max-w-xl mx-auto px-4 py-12 sm:py-20 w-full flex flex-col justify-center">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 border border-orange-200/60 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-3 shadow-xs">
            🔍
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
            <span>Public Civic Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Track Civic Complaint
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Enter your 8-character NagarSetu tracking code (e.g.{' '}
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              NS-KO0201
            </span>
            ) to view real-time resolution status and AI triage assessment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="track-code-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Tracking Code
            </label>
            <input
              id="track-code-input"
              name="trackingCode"
              type="text"
              aria-label="Enter NagarSetu tracking code"
              placeholder="e.g. NS-KO0201"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xl font-black text-slate-900 tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all uppercase text-center"
            />
            {error && (
              <div
                role="alert"
                className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            aria-label="Submit tracking code to check status"
            className="w-full py-4 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:via-orange-600 hover:to-amber-600 active:scale-[0.99] text-white font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all text-sm tracking-wide cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Check Status & AI Analysis</span>
            <span>→</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500 text-center">
          <span className="font-semibold text-slate-600">Sample seeded complaint codes for testing:</span>
          <div className="flex flex-wrap justify-center gap-2 mt-3 font-mono">
            {['NS-MG0101', 'NS-MG0102', 'NS-KO0201', 'NS-IN0301'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => router.push(`/report/${c}`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 text-slate-700 border border-slate-200/80 rounded-xl transition-all cursor-pointer font-bold text-xs"
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

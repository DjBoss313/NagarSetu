'use client';

import Link from 'next/link';

export default function OfficerAuthRequired() {
  const handleAuthenticate = () => {
    localStorage.setItem('nagarsetu_role', 'officer');
    document.cookie = 'nagarsetu_role=officer; path=/; max-age=31536000';
    window.location.reload();
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-16 w-full flex flex-col items-center text-center">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-card w-full flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center text-3xl font-black shadow-xs">
          🔒
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200 mb-2">
            <span>Authentication & Authorization Required</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Officer Operations Portal Restricted
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Access to citywide grievance triage, GIS operational maps, and citizen complaint records is restricted to verified municipal officers to prevent unauthorized access to citizens&apos; private data.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleAuthenticate}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Authenticate as Municipal Officer</span>
            <span>→</span>
          </button>
          <Link
            href="/"
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors text-center"
          >
            ← Return to Citizen Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

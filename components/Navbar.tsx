'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<'citizen' | 'officer'>('citizen');
  const [trackingInput, setTrackingInput] = useState('');

  useEffect(() => {
    // Read persisted role from localStorage or cookie
    const savedRole = localStorage.getItem('nagarsetu_role') as 'citizen' | 'officer' | null;
    const timer = setTimeout(() => {
      if (savedRole) {
        setRole(savedRole);
      } else if (pathname.startsWith('/officer')) {
        setRole('officer');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const switchRole = (newRole: 'citizen' | 'officer') => {
    setRole(newRole);
    localStorage.setItem('nagarsetu_role', newRole);
    document.cookie = `nagarsetu_role=${newRole}; path=/; max-age=31536000`;

    if (newRole === 'officer' && !pathname.startsWith('/officer')) {
      router.push('/officer');
    } else if (newRole === 'citizen' && pathname.startsWith('/officer')) {
      router.push('/');
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingInput.trim().toUpperCase();
    if (clean) {
      router.push(`/report/${clean}`);
      setTrackingInput('');
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <Link
            href={role === 'officer' ? '/officer' : '/'}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              NS
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 block leading-tight group-hover:text-blue-700 transition-colors">
                NagarSetu
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 block leading-none">
                Civic Action Portal
              </span>
            </div>
          </Link>

          {/* Quick Nav Links with Active-Page Highlight */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1.5 text-xs font-semibold">
            {role === 'citizen' ? (
              <>
                <Link
                  href="/"
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    pathname === '/'
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                  }`}
                >
                  File Complaint
                </Link>
                <Link
                  href="/track"
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    pathname === '/track'
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                  }`}
                >
                  Track Status
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/officer"
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    pathname === '/officer'
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                  }`}
                >
                  Triage List
                </Link>
                <Link
                  href="/officer/map"
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    pathname === '/officer/map'
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                  }`}
                >
                  GIS Map
                </Link>
                <Link
                  href="/officer/hotspots"
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    pathname === '/officer/hotspots'
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                  }`}
                >
                  Hotspot Briefs
                </Link>
              </>
            )}
          </nav>

          {/* Quick Track Search Input */}
          <form
            onSubmit={handleTrackSubmit}
            aria-label="Quick Complaint Tracker"
            className="hidden md:flex items-center max-w-xs w-full relative"
          >
            <input
              type="text"
              name="navTrackingCode"
              aria-label="Track complaint tracking code"
              placeholder="Track code (e.g. NS-KO0201)..."
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="w-full text-xs bg-slate-50/80 border border-slate-200 rounded-xl pl-3 pr-16 py-2 font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            <button
              type="submit"
              aria-label="Search tracking code"
              className="absolute right-1 top-1 bottom-1 px-3 bg-slate-200 hover:bg-orange-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Track
            </button>
          </form>

          {/* Role Toggle with Demo Convenience Note */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <div role="tablist" aria-label="Role Switcher" className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold shadow-inner">
              <button
                type="button"
                role="tab"
                aria-selected={role === 'citizen'}
                aria-label="Switch to Citizen portal"
                onClick={() => switchRole('citizen')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  role === 'citizen'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Citizen
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === 'officer'}
                aria-label="Switch to Officer portal"
                onClick={() => switchRole('officer')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  role === 'officer'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Officer
              </button>
            </div>
            <span className="text-[9px] text-slate-400 hidden sm:block">
              Demo convenience: No auth required
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

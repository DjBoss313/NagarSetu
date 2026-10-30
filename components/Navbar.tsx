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
    // Read persisted role from localStorage
    const savedRole = localStorage.getItem('nagarsetu_role') as 'citizen' | 'officer' | null;
    if (savedRole) {
      setRole(savedRole);
    } else if (pathname.startsWith('/officer')) {
      setRole('officer');
    }
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
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              NS
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-tight">
                NagarSetu
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block leading-none">
                Complaints to Action
              </span>
            </div>
          </Link>

          {/* Quick Track Input */}
          <form
            onSubmit={handleTrackSubmit}
            className="hidden md:flex items-center max-w-xs w-full relative"
          >
            <input
              type="text"
              placeholder="Track code (e.g. NS-KO0201)..."
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-14 py-2 font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold rounded-md transition-colors"
            >
              Track
            </button>
          </form>

          {/* Role Toggle Switch & Nav */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Citizen / Officer Pill Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchRole('citizen')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  role === 'citizen'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Citizen
              </button>
              <button
                type="button"
                onClick={() => switchRole('officer')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  role === 'officer'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Officer
              </button>
            </div>

            {/* Mobile Track Link */}
            <Link
              href="/track"
              className="md:hidden text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1"
            >
              Track
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

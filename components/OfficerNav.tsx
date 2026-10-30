'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OfficerNav() {
  const pathname = usePathname();

  const navItems = [
    { label: '📋 Triage & Reports', href: '/officer' },
    { label: '🗺️ GIS Hotspot Map', href: '/officer/map' },
    { label: '🔥 Hotspots & Briefs', href: '/officer/hotspots' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Ward Officer Operations Portal
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import Navbar from "@/components/Navbar";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NagarSetu — From Complaints to Action",
  description:
    "AI-powered civic complaint categorization, priority scoring, duplicate detection, and officer action workflow for modern cities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900">
        <Suspense fallback={<nav className="h-16 bg-white border-b border-slate-200" />}>
          <Navbar />
        </Suspense>

        <div className="flex-1 flex flex-col">{children}</div>

        {/* Civic Footer */}
        <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand & Mission */}
              <div className="md:col-span-2 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-orange-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                    NS
                  </div>
                  <span className="font-extrabold text-lg tracking-tight text-white">
                    NagarSetu
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    City of Mangaluru (MCC)
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Bridging the gap between citizen civic grievances and municipal field dispatch. Real-time AI categorization, explainable priority scoring, and transparent resolution tracking.
                </p>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>🚨 Emergency Helplines:</span>
                  <span className="text-slate-300 font-mono">Police 112 • Ambulance 108 • Municipal 1533</span>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="flex flex-col gap-2.5 text-xs">
                <span className="font-bold uppercase tracking-wider text-white text-[11px]">
                  Citizen Portal
                </span>
                <Link href="/" className="hover:text-white transition-colors">
                  File a Complaint
                </Link>
                <Link href="/track" className="hover:text-white transition-colors">
                  Track Resolution Status
                </Link>
                <a
                  href="#how-it-works"
                  className="hover:text-white transition-colors"
                >
                  How NagarSetu Works
                </a>
              </div>

              {/* Officer Suite */}
              <div className="flex flex-col gap-2.5 text-xs">
                <span className="font-bold uppercase tracking-wider text-white text-[11px]">
                  Ward Operations
                </span>
                <Link href="/officer" className="hover:text-white transition-colors">
                  Triage Dashboard
                </Link>
                <Link href="/officer/map" className="hover:text-white transition-colors">
                  City GIS Map
                </Link>
                <Link href="/officer/hotspots" className="hover:text-white transition-colors">
                  Hotspot Briefs
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
              <p>© {new Date().getFullYear()} NagarSetu. Open Civic Infrastructure Platform.</p>
              <p className="text-slate-400">
                Transparent AI Triage • Zero Black-Box Decisions
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

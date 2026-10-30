import Navbar from "@/components/Navbar";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NagarSetu — From Complaints to Action",
  description:
    "AI-powered civic complaint categorization, priority scoring, duplicate detection, and officer action workflow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Suspense fallback={<nav className="h-16 bg-white border-b border-slate-200" />}>
          <Navbar />
        </Suspense>
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bangkok Place Guide",
  description: "Minimal Bangkok curation platform for Korean travelers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="mesh-bg min-h-full text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
          <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
              Bangkok Place
            </Link>
            <div className="flex items-center gap-1 text-sm text-slate-700">
              <Link href="/places" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                Places
              </Link>
              <Link href="/map" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                Map
              </Link>
              <Link href="/admin/places" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                Admin
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto mt-10 w-full max-w-6xl px-4 pb-10 text-xs text-slate-500">
          Built for Bangkok local curation · MVP edition
        </footer>
      </body>
    </html>
  );
}

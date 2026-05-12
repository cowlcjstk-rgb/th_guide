import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Bangkok Place",
  description: "방콕 장소 큐레이션 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-bold tracking-tight">
              Bangkok Place
            </Link>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Link href="/places" className="hover:text-slate-900">
                장소
              </Link>
              <Link href="/map" className="hover:text-slate-900">
                지도
              </Link>
              <Link href="/admin/places" className="hover:text-slate-900">
                관리자
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

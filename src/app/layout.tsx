import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import SiteHeader from "@/components/site-header";
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
      <body suppressHydrationWarning className="mesh-bg min-h-full text-slate-900">
        <LanguageProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto mt-10 w-full max-w-6xl px-4 pb-10 text-xs text-slate-500">
            Built for Bangkok local curation · MVP edition
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}

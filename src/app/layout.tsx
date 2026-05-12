import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import SideMenu from "@/components/side-menu";
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
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[260px_1fr]">
            <SideMenu />
            <div>
              <main>{children}</main>
              <footer className="mt-10 pb-8 text-xs text-slate-500">
                Built for Bangkok local curation · MVP edition
              </footer>
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}

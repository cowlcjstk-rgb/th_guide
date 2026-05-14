import type { Metadata } from "next";
import { Geist } from "next/font/google";
import AppShell from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-provider";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thailand Guide",
  description: "Thailand traveler community platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="mesh-bg min-h-full text-slate-900">
        <AuthProvider>
          <LanguageProvider>
            <AppShell>{children}</AppShell>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


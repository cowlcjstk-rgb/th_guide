import type { Metadata } from "next";
import { Geist } from "next/font/google";
import AppShell from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-provider";
import { LanguageProvider } from "@/components/language-provider";
import { SavedPlacesProvider } from "@/components/saved-places-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://th-guide.vercel.app"),
  title: "Thailand Guide",
  description: "Thailand traveler community platform",
  openGraph: {
    title: "Thailand Guide",
    description: "Thailand traveler community platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Thailand Guide",
    description: "Thailand traveler community platform",
  },
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
          <SavedPlacesProvider>
            <LanguageProvider>
              <AppShell>{children}</AppShell>
            </LanguageProvider>
          </SavedPlacesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


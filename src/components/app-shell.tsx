"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SideMenu from "@/components/side-menu";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        className="fixed left-3 top-3 z-50 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold shadow lg:hidden"
        onClick={() => setMobileMenuOpen((v) => !v)}
      >
        {mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
      </button>

      {mobileMenuOpen ? (
        <button
          aria-label="menu-overlay"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[280px] overflow-y-auto border-r border-slate-200 bg-white transition-transform lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SideMenu />
      </aside>

      <div className="mx-auto w-full max-w-7xl px-3 pb-6 pt-14 lg:grid lg:grid-cols-[260px_1fr] lg:gap-6 lg:px-4 lg:pt-4">
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:h-fit">
          <div className="panel">
            <SideMenu />
          </div>
        </aside>
        <div className="min-w-0 pb-20 lg:pb-0">
          <main>{children}</main>
          <footer className="mt-10 pb-8 text-xs text-slate-500">
            <div>Thailand Guide · Community + Curation MVP</div>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/legal/privacy" className="hover:text-slate-800">개인정보처리방침</Link>
              <Link href="/legal/terms" className="hover:text-slate-800">이용약관</Link>
              <Link href="/support" className="hover:text-slate-800">문의 채널</Link>
              <a href="/api/health" className="hover:text-slate-800">시스템 상태</a>
            </div>
          </footer>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-4 px-2 py-1">
          <Link href="/" className={`rounded-lg px-2 py-2 text-center text-[11px] ${pathname === "/" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"}`}>
            홈
          </Link>
          <Link href="/places" className={`rounded-lg px-2 py-2 text-center text-[11px] ${pathname.startsWith("/places") ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"}`}>
            장소
          </Link>
          <Link href="/map" className={`rounded-lg px-2 py-2 text-center text-[11px] ${pathname.startsWith("/map") ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"}`}>
            지도
          </Link>
          <Link href="/community" className={`rounded-lg px-2 py-2 text-center text-[11px] ${pathname.startsWith("/community") ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"}`}>
            커뮤니티
          </Link>
        </div>
      </nav>
    </>
  );
}

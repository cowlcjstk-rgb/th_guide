"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { trackClientEvent } from "@/components/analytics-tracker";
import { useAuth } from "@/components/auth-provider";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-slate-200 text-slate-900" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

function Section({
  title,
  open,
  setOpen,
  children,
}: {
  title: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        className="mb-2 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span>{open ? "-" : "+"}</span>
      </button>
      {open ? <div className="space-y-1">{children}</div> : null}
    </div>
  );
}

export default function SideMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mainOpen, setMainOpen] = useState(true);
  const [communityOpen, setCommunityOpen] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const nightlifeUrl = (process.env.NEXT_PUBLIC_NIGHTLIFE_PLATFORM_URL || process.env.NIGHTLIFE_PLATFORM_URL || "").trim();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="h-full p-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
          Thailand Guide
        </Link>
      </div>

      {user ? (
        <p className="mt-3 text-xs text-slate-600">
          {user.name} {isAdmin ? "(ADMIN)" : ""}
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        <Section title="메인" open={mainOpen} setOpen={setMainOpen}>
          <NavLink href="/" label="홈" active={pathname === "/"} />
          <NavLink href="/places" label="장소 탐색" active={pathname.startsWith("/places")} />
          <NavLink href="/map" label="지도 플래너" active={pathname.startsWith("/map")} />
          {nightlifeUrl ? (
            <a href={nightlifeUrl} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              밤문화 플랫폼(별도)
            </a>
          ) : null}
        </Section>

        <Section title="커뮤니티" open={communityOpen} setOpen={setCommunityOpen}>
          <NavLink href="/community" label="커뮤니티 홈" active={pathname === "/community"} />
          <NavLink href="/community/top-rated" label="평점 랭킹" active={pathname === "/community/top-rated"} />
          <NavLink href="/community/latest-reviews" label="최신 리뷰" active={pathname === "/community/latest-reviews"} />
          <NavLink href="/community/route-shares" label="동선 공유" active={pathname === "/community/route-shares"} />
          <NavLink href="/community/guide" label="여행 가이드" active={pathname === "/community/guide"} />
          <NavLink href="/community/faq" label="자주 묻는 질문" active={pathname === "/community/faq"} />
        </Section>

        <Section title="등록" open={registerOpen} setOpen={setRegisterOpen}>
          <NavLink href="/submit/place" label="장소 등록" active={pathname.startsWith("/submit/place") && !pathname.startsWith("/submit/place-edit")} />
          <NavLink href="/submit/place-edit" label="장소 수정 요청" active={pathname.startsWith("/submit/place-edit")} />
        </Section>

        <Section title="로그인" open={accountOpen} setOpen={setAccountOpen}>
          {!user ? (
            <>
              <NavLink href="/auth/login" label="로그인" active={pathname === "/auth/login"} />
              <NavLink href="/signup" label="회원가입" active={pathname === "/signup"} />
              <NavLink href="/auth/find-id" label="아이디 찾기" active={pathname === "/auth/find-id"} />
              <NavLink href="/auth/reset-password" label="비밀번호 찾기" active={pathname === "/auth/reset-password"} />
            </>
          ) : (
            <>
              <NavLink href="/me" label="회원 정보 확인" active={pathname === "/me"} />
              <NavLink href="/me/saved" label="내 저장 장소" active={pathname.startsWith("/me/saved")} />
              <NavLink href="/me/submitted-places" label="내 등록 장소" active={pathname.startsWith("/me/submitted-places")} />
              <NavLink href="/me/submitted-routes" label="내 등록 동선" active={pathname.startsWith("/me/submitted-routes")} />
              <button
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                로그아웃
              </button>
            </>
          )}
        </Section>

        {isAdmin ? (
          <Section title="관리" open={adminOpen} setOpen={setAdminOpen}>
            <NavLink href="/admin" label="대시보드" active={pathname === "/admin"} />
            <NavLink href="/admin/places" label="장소 등록(관리자)" active={pathname === "/admin/places"} />
            <NavLink href="/admin/review" label="승인 관리" active={pathname === "/admin/review"} />
            <NavLink href="/admin/review?tab=edits" label="수정 검토" active={pathname === "/admin/review"} />
            <NavLink href="/admin/community" label="커뮤니티 관리" active={pathname === "/admin/community"} />
            <NavLink href="/admin/members" label="회원 관리" active={pathname === "/admin/members"} />
          </Section>
        ) : null}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">문의 채널</p>
          <div className="space-y-2">
            <a
              href="https://open.kakao.com/o/sW9C8Rui"
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-slate-200 bg-white"
              onClick={() => trackClientEvent("support_channel_click", { source: "side_menu", channel: "kakao" })}
            >
              <img src="/banners/kakao-openchat.svg" alt="카카오톡 오픈채팅 문의 채널" className="h-auto w-full" />
            </a>
            <a
              href="https://line.me/ti/g2/Qtxu4_Yt8Ii2PYERHPrxobMY-UzAjH91Lwy4Ug?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-slate-200 bg-white"
              onClick={() => trackClientEvent("support_channel_click", { source: "side_menu", channel: "line" })}
            >
              <img src="/banners/line-openchat.svg" alt="라인 오픈챗 문의 채널" className="h-auto w-full" />
            </a>
            <a
              href="https://t.me/th_aapp"
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-slate-200 bg-white"
              onClick={() => trackClientEvent("support_channel_click", { source: "side_menu", channel: "telegram" })}
            >
              <img src="/banners/telegram-contact.svg" alt="텔레그램 문의 채널" className="h-auto w-full" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
